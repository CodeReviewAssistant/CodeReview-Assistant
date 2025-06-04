import os
import requests
import urllib.parse 
import json 
from dotenv import load_dotenv
from github import Github, GithubException, UnknownObjectException, BadCredentialsException
from fastapi import Request, HTTPException 
import traceback
from typing import Optional, Tuple, Dict, Any, List # Added List for type hint

# Assuming LLM and Vulnerability are in app.api.git and correctly imported
# Ensure these paths are correct relative to your project structure.
from app.api.git import LLM as AdvancedLLM
from app.api.git import Vulnerability

load_dotenv(override=True) 

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_BASE_URL_FOR_INTERNAL_CALLS = os.getenv("API_BASE_URL_FOR_INTERNAL_CALLS", "http://localhost:8000")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "super-secret-internal-token") 

class GitHubHelper:
    def __init__(self, user_github_token: str):
        if not user_github_token:
            print("CRITICAL_INIT_ERROR: GitHubHelper initialized with no token.")
            raise ValueError("GitHub token is required for GitHubHelper initialization but was not provided.")

        self.token = user_github_token
        self.g = Github(self.token) 
        self.user = None 

        try:
            self.user = self.g.get_user() 
            user_login_name = self.user.login
            print(f"GitHubHelper initialized successfully for user: {user_login_name} (token starts with: {self.token[:4]}...).")
        except BadCredentialsException as bce:
            error_message = bce.data.get('message', 'Bad credentials') if hasattr(bce, 'data') and isinstance(bce.data, dict) else 'Bad credentials'
            print(f"GITHUB_HELPER_INIT_ERROR: BadCredentialsException for token starting with {self.token[:4]}... - Status: {bce.status}, Message: {error_message}")
            raise ValueError(f"Invalid GitHub token provided: {error_message}") from bce
        except GithubException as ge: 
            error_message = ge.data.get('message', str(ge)) if hasattr(ge, 'data') and isinstance(ge.data, dict) else str(ge)
            print(f"GITHUB_HELPER_INIT_ERROR: GithubException during initialization for token starting with {self.token[:4]}... - Status: {ge.status}, Message: {error_message}")
            raise ValueError(f"Failed to initialize GitHub connection: {error_message}") from ge
        except Exception as e_init: 
            print(f"GITHUB_HELPER_INIT_ERROR: Unexpected error during initialization for token starting with {self.token[:4]}...: {type(e_init).__name__} - {e_init}")
            traceback.print_exc()
            raise ValueError(f"Unexpected error initializing GitHub connection: {str(e_init)}") from e_init

        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28" 
        }
        self.base_api_url = "https://api.github.com"
        
        try:
            self.llm = AdvancedLLM()
            print(f"DEBUG: GitHubHelper successfully initialized AdvancedLLM (type: {type(self.llm)}).")
        except Exception as e_llm_init:
            print(f"CRITICAL_ERROR: GitHubHelper failed to initialize AdvancedLLM: {e_llm_init}")
            traceback.print_exc() 
            raise RuntimeError(f"Failed to initialize AdvancedLLM in GitHubHelper: {e_llm_init}") from e_llm_init
        
        try:
            self.vulnerability_scanner = Vulnerability()
            print(f"DEBUG: GitHubHelper successfully initialized Vulnerability scanner (type: {type(self.vulnerability_scanner)}).")
        except Exception as e_vuln_init:
            print(f"CRITICAL_ERROR: GitHubHelper failed to initialize Vulnerability scanner: {e_vuln_init}")
            traceback.print_exc()
            raise RuntimeError(f"Failed to initialize Vulnerability scanner in GitHubHelper: {e_vuln_init}") from e_vuln_init

        self.ignored_file_types = [
            ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", 
            "readme.md", 
            ".lock", "package-lock.json", "poetry.lock", "yarn.lock", 
            ".env", 
            "*.tfvars", 
            "*.log", 
            "license", 
            ".gitignore" 
        ] 

        self.api_base_url_internal = API_BASE_URL_FOR_INTERNAL_CALLS
        self.internal_service_token = INTERNAL_SERVICE_TOKEN

    def _increment_project_metrics(self, repo_full_name: str, files_analyzed_increment: int = 0, pr_analyzed_increment: int = 0):
        if not self.internal_service_token or self.internal_service_token == "super-secret-internal-token": 
            print(f"WARNING: INTERNAL_SERVICE_TOKEN not set or is default. Cannot update metrics for {repo_full_name} via internal API.")
            return
        if files_analyzed_increment == 0 and pr_analyzed_increment == 0:
            return 
        
        if '/' not in repo_full_name:
            print(f"ERROR: Invalid repo_full_name '{repo_full_name}' for incrementing metrics.")
            return
            
        try:
            owner, repo_name = repo_full_name.split('/', 1)
            # Path corrected to match users.py if internal calls go to the same app's /users router
            url = f"{self.api_base_url_internal}/users/internal/projects/{owner}/{repo_name}/increment_metrics" 
            payload = {
                "files_analyzed_increment": files_analyzed_increment,
                "pull_requests_analyzed_increment": pr_analyzed_increment
            }
            headers = {
                "Content-Type": "application/json",
                "trusted-source-token": self.internal_service_token 
            }
            
            response = requests.put(url, json=payload, headers=headers, timeout=10) 
            
            if response.status_code == 200:
                print(f"Successfully incremented metrics for {repo_full_name} via internal API: files_delta={files_analyzed_increment}, pr_delta={pr_analyzed_increment}")
            else:
                print(f"ERROR: Failed to increment metrics for {repo_full_name} via internal API. Status: {response.status_code}, Response: {response.text[:200]}") 
        except requests.exceptions.RequestException as e_req:
            print(f"ERROR: RequestException while trying to increment project metrics for {repo_full_name}: {e_req}")
        except Exception as e:
            print(f"ERROR: Unexpected exception while trying to increment project metrics for {repo_full_name}: {e}")
            traceback.print_exc()

    def get_user_repositories(self) -> List[Dict[str, Any]]:
        print(f"--- GitHubHelper: Fetching repositories for user {self.user.login if self.user else 'UnknownUser'} ---")
        if not self.user:
            print("ERROR get_user_repositories: GitHub user not authenticated or helper not properly initialized.")
            raise RuntimeError("GitHubHelper user object not available. Initialization likely failed.")
        
        repos_data: List[Dict[str, Any]] = []
        try:
            # MODIFIED: Removed the 'type' parameter to avoid conflict with 'affiliation'
            for repo in self.user.get_repos(affiliation='owner,collaborator,organization_member'):
                if repo.permissions and repo.permissions.admin: 
                    repos_data.append({
                        "id": str(repo.id), 
                        "name": repo.name,
                        "name_with_namespace": repo.full_name, 
                        "description": repo.description if repo.description else "", 
                        "html_url": repo.html_url
                    })
            print(f"Found {len(repos_data)} repositories with admin permissions for user {self.user.login}.")
            return repos_data
        except GithubException as e:
            error_message = e.data.get('message', str(e)) if hasattr(e, 'data') and isinstance(e.data, dict) else str(e)
            print(f"GitHub API error fetching repositories for {self.user.login}: Status {e.status}, Error: {error_message}")
            raise 
        except Exception as e_other:
            print(f"DEBUG get_user_repositories: An unexpected error occurred for {self.user.login}: {type(e_other).__name__} - {e_other}")
            traceback.print_exc()
            raise

    def add_user_as_collaborator(self, repo_full_name: str, username: str, permission: str = "push") -> Tuple[bool, str, Optional[int]]:
        print(f"--- GitHubHelper: Attempting to add {username} to {repo_full_name} with permission {permission} ---")
        url = f"{self.base_api_url}/repos/{repo_full_name}/collaborators/{username}"
        payload = {"permission": permission} 
        
        invitation_id: Optional[int] = None
        success = False
        message = ""

        try:
            response = requests.put(url, headers=self.headers, json=payload, timeout=15)
            response.raise_for_status() 

            response_data = response.json() if response.content else {} 
            
            if response.status_code == 201: 
                invitation_id = response_data.get("id")
                success = True
                message = f"Successfully sent invitation to {username} for {repo_full_name}."
                if not invitation_id: 
                    message += " (Warning: Invitation ID was not found in the response)."
            elif response.status_code == 204: 
                success = True
                message = f"{username} is already a collaborator on {repo_full_name} or has direct access."
            else: 
                message = f"Unexpected success status ({response.status_code}) adding collaborator: {response.text[:200]}"

        except requests.exceptions.HTTPError as e:
            response_data = {}
            status_code = e.response.status_code if e.response is not None else 500
            try: 
                if e.response is not None and e.response.content:
                    response_data = e.response.json()
            except requests.exceptions.JSONDecodeError: 
                response_data = {"message": e.response.text[:200] if e.response is not None else "Unknown HTTP error"}

            error_message_detail = response_data.get('message', 'Failed to add collaborator due to HTTP error.')
            
            if status_code == 404: message = f"Failed to add collaborator: Repository '{repo_full_name}' or User '{username}' not found, or token lacks necessary rights."
            elif status_code == 403: message = f"Failed to add collaborator: Permission denied to manage collaborators on '{repo_full_name}'."
            elif status_code == 422: 
                 errors_list = response_data.get('errors', [])
                 if any("already a collaborator" in str(err).lower() for err in errors_list):
                      success = True 
                      message = f"{username} is already a collaborator on {repo_full_name} (confirmed by 422 error)."
                 else:
                      message = f"Failed to add collaborator: Validation failed ({error_message_detail}). Details: {errors_list}"
            else: message = f"Failed to add collaborator: {error_message_detail} (Status: {status_code})"
        except requests.exceptions.RequestException as e_req: 
            message = f"Network error while adding collaborator: {str(e_req)}"
        except Exception as e_gen: 
            traceback.print_exc()
            message = f"Unexpected error adding collaborator: {str(e_gen)}"
        
        if invitation_id:
            try: invitation_id = int(invitation_id)
            except (ValueError, TypeError): 
                message += f" (Warning: Received non-integer invitation ID: {invitation_id})."
                invitation_id = None

        print(f"--- GitHubHelper.add_user_as_collaborator result: Success={success}, Message='{message}', InvitationID={invitation_id} ---")
        return success, message, invitation_id

    def accept_repository_invitation(self, invitation_id: int) -> Tuple[bool, str]:
        print(f"--- GitHubHelper: Accepting repository invitation ID {invitation_id} ---")
        if not isinstance(invitation_id, int) or invitation_id <= 0:
             return False, f"Invalid invitation ID provided: {invitation_id}. Must be a positive integer."
        
        url = f"{self.base_api_url}/user/repository_invitations/{invitation_id}"
        try:
            response = requests.patch(url, headers=self.headers, timeout=10) 
            response.raise_for_status() 

            if response.status_code == 204: 
                return True, f"Invitation {invitation_id} accepted successfully."
            return False, f"Unexpected status {response.status_code} when accepting invitation {invitation_id}. Response: {response.text[:100]}"
        
        except requests.exceptions.HTTPError as e:
            error_message_detail = "Failed to accept invitation"
            status_code = e.response.status_code if e.response is not None else 500
            try: 
                if e.response is not None and e.response.content:
                    error_message_detail = e.response.json().get('message', e.response.text[:100])
            except requests.exceptions.JSONDecodeError:
                if e.response is not None: error_message_detail = e.response.text[:100]
            
            if status_code == 404: error_message_detail = "Invitation not found. It might have expired, or already been accepted/declined."
            elif status_code == 403: error_message_detail = "Permission denied to accept this invitation (check token scopes for the bot)."
            elif status_code == 304: 
                 return True, f"Invitation {invitation_id} was already accepted (Status 304)."
            return False, f"{error_message_detail} (Status: {status_code})"
        except requests.exceptions.RequestException as e_req:
            return False, f"Network error accepting invitation {invitation_id}: {str(e_req)}"
        except Exception as e_gen:
            traceback.print_exc()
            return False, f"Unexpected error accepting invitation {invitation_id}: {str(e_gen)}"

    def get_pull_request_files_and_diff(self, repo_full_name: str, pull_number: int) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str], Optional[str]]:
        files_changed_data: List[Dict[str, Any]] = []
        try:
            repo = self.g.get_repo(repo_full_name)
            pull = repo.get_pull(pull_number)
            
            base_sha = pull.base.sha
            head_sha = pull.head.sha
            base_ref = pull.base.ref
            head_ref = pull.head.ref

            for file_obj in pull.get_files():
                filename_lower = file_obj.filename.lower()
                
                is_ignored = False
                for ignored_pattern in self.ignored_file_types:
                    pattern_lower = ignored_pattern.lower()
                    if pattern_lower.startswith("*."): 
                        if filename_lower.endswith(pattern_lower[1:]):
                            is_ignored = True
                            break
                    elif filename_lower == pattern_lower or filename_lower.endswith(pattern_lower): 
                        is_ignored = True
                        break
                
                if is_ignored:
                    print(f"INFO: Skipping ignored file in PR {repo_full_name}#{pull_number}: {file_obj.filename}")
                    continue

                file_data: Dict[str, Any] = {
                    "filename": file_obj.filename, 
                    "status": file_obj.status, 
                    "patch": file_obj.patch if file_obj.patch else "", 
                    "sha": file_obj.sha, 
                    "new_content": None, 
                    "old_content": None,
                    "previous_filename": file_obj.previous_filename if file_obj.status == 'renamed' else None
                }
                
                if file_obj.status in ['added', 'modified', 'renamed']:
                    try:
                        content_obj = repo.get_contents(file_obj.filename, ref=head_sha)
                        if content_obj.type == 'file': 
                             file_data["new_content"] = content_obj.decoded_content.decode('utf-8', errors='replace')
                        else: print(f"INFO: Skipping content fetch for non-file type '{content_obj.type}' for {file_obj.filename} at {head_sha}")
                    except UnknownObjectException: 
                         print(f"WARNING: Content for {file_obj.filename} (ref: {head_sha}) not found or too large. Using patch if available.")
                    except GithubException as e_content_gh:
                         print(f"WARNING: GitHub error getting new content for {file_obj.filename} (ref: {head_sha}): {e_content_gh.status} {e_content_gh.data.get('message','')}. Using patch if available.")
                    except Exception as e_content: 
                        print(f"WARNING: Error decoding new content for {file_obj.filename} (ref: {head_sha}): {e_content}. Using patch if available.")
                
                if file_obj.status in ['modified', 'renamed']:
                    old_path_for_content = file_obj.previous_filename if file_obj.status == 'renamed' and file_obj.previous_filename else file_obj.filename
                    try:
                        content_obj_old = repo.get_contents(old_path_for_content, ref=base_sha)
                        if content_obj_old.type == 'file':
                            file_data["old_content"] = content_obj_old.decoded_content.decode('utf-8', errors='replace')
                        else: print(f"INFO: Skipping old content fetch for non-file type '{content_obj_old.type}' for {old_path_for_content} at {base_sha}")
                    except UnknownObjectException:
                         print(f"WARNING: Old content for {old_path_for_content} (ref: {base_sha}) not found or too large.")
                    except GithubException as e_content_old_gh:
                         print(f"WARNING: GitHub error getting old content for {old_path_for_content} (ref: {base_sha}): {e_content_old_gh.status} {e_content_old_gh.data.get('message','')}.")
                    except Exception as e_content_old:
                         print(f"WARNING: Error decoding old content for {old_path_for_content} (ref: {base_sha}): {e_content_old}.")
                
                files_changed_data.append(file_data)
            return files_changed_data, base_ref, head_ref
        
        except GithubException as e: 
            error_message = e.data.get('message', str(e)) if hasattr(e, 'data') and isinstance(e.data, dict) else str(e)
            print(f"GitHub API error fetching PR files for {repo_full_name} #{pull_number}: Status {e.status}, {error_message}")
            raise 
        except Exception as e_outer: 
            print(f"Unexpected error in get_pull_request_files_and_diff for {repo_full_name} #{pull_number}: {type(e_outer).__name__} - {e_outer}")
            traceback.print_exc()
            raise
        # This line should ideally not be reached if exceptions are re-raised.
        # However, to satisfy type hinting for the return Tuple, ensure all paths return appropriately.
        # If an unhandled case led here, it implies an error, so returning None for all parts.
        return None, None, None 

    def publish_pull_request_comment(self, repo_full_name: str, pull_number: int, comment_body: str, 
                                     filename: Optional[str] = None, current_file_num: Optional[int] = None, total_files_num: Optional[int] = None) -> Tuple[int, str]:
        try:
            repo = self.g.get_repo(repo_full_name)
            pull = repo.get_pull(pull_number) 
            
            file_progress_header = ""
            if filename and current_file_num is not None and total_files_num is not None:
                if total_files_num > 0 and current_file_num > 0 and current_file_num <= total_files_num:
                    file_progress_header = f" (File {current_file_num} of {total_files_num})"
            
            formatted_comment_header = f"### AI Review for `{filename}`{file_progress_header}\n\n---\n\n" if filename else ""
            full_comment_body = f"{formatted_comment_header}{comment_body}"
            
            comment_obj = pull.create_issue_comment(full_comment_body) 
            
            if comment_obj and comment_obj.id:
                print(f"Successfully posted comment to PR {repo_full_name}#{pull_number} (Comment ID: {comment_obj.id}).")
                return 201, "Successfully posted comment." 
            else:
                print(f"ERROR: Comment posting to PR {repo_full_name}#{pull_number} returned an unexpected result (no comment object or ID).")
                return 500, "Comment posting returned unexpected result."
        except GithubException as e:
            error_message = e.data.get('message', str(e)) if hasattr(e, 'data') and isinstance(e.data, dict) else str(e)
            print(f"GitHub API error posting comment to PR {repo_full_name}#{pull_number} for file '{filename}': Status {e.status}, Message: {error_message}")
            return e.status if isinstance(e.status, int) else 500, f"GitHub API Error: {error_message}"
        except Exception as e_gen:
            print(f"Generic error in publish_pull_request_comment for {repo_full_name}#{pull_number}, file '{filename}': {type(e_gen).__name__} - {e_gen}")
            traceback.print_exc()
            return 500, f"Unexpected error posting comment: {str(e_gen)}"

    def get_comments_from_pr_changes(self, repo_full_name: str, pull_number: int) -> Tuple[int, str]:
        print(f"--- GitHubHelper: Starting review process for PR {repo_full_name}#{pull_number} ---")
        files_changed_raw: Optional[List[Dict[str, Any]]] = None
        base_ref: Optional[str] = None
        head_ref: Optional[str] = None
        try:
            files_changed_raw, base_ref, head_ref = self.get_pull_request_files_and_diff(repo_full_name, pull_number)
            if files_changed_raw is None: 
                print(f"ERROR: Failed to retrieve PR file changes (returned None) for {repo_full_name}#{pull_number}.")
                self.publish_pull_request_comment(repo_full_name, pull_number, "⚠️ CodeReview-Assistant: Critical error - could not retrieve file changes for review.")
                return 500, "Critical error: Failed to retrieve PR file changes."
        except Exception as e_get_files: 
            print(f"ERROR: Could not retrieve PR file changes for {repo_full_name}#{pull_number}: {e_get_files}")
            self.publish_pull_request_comment(repo_full_name, pull_number, f"⚠️ CodeReview-Assistant: Error retrieving files for review: {str(e_get_files)[:500]}")
            return 500, f"Could not retrieve PR file changes: {str(e_get_files)}"

        self._increment_project_metrics(repo_full_name, pr_analyzed_increment=1)

        reviewable_files: List[Dict[str, Any]] = []
        for file_info_raw in files_changed_raw: 
            if file_info_raw.get('status') == 'removed':
                print(f"INFO: Skipping removed file: {file_info_raw['filename']} in PR {repo_full_name}#{pull_number}")
                continue
            if not file_info_raw.get('new_content') and not file_info_raw.get('patch'):
                print(f"INFO: Skipping file with no reviewable content (no new_content or patch): {file_info_raw['filename']} in PR {repo_full_name}#{pull_number}")
                continue
            reviewable_files.append(file_info_raw)

        num_reviewable_files = len(reviewable_files)
        if num_reviewable_files == 0:
            print(f"INFO: No reviewable files (added, modified with content/patch) found in PR {repo_full_name}#{pull_number}")
            self.publish_pull_request_comment(repo_full_name, pull_number, "🤖 CodeReview-Assistant: No files in this update require detailed review.")
            return 200, "No reviewable files found that require detailed review."

        initial_comment_body = f"🤖 CodeReview-Assistant: Starting review for **{num_reviewable_files}** file(s). Individual comments will follow if issues are found or analysis is performed."
        status_code_initial, msg_initial = self.publish_pull_request_comment(repo_full_name, pull_number, initial_comment_body)
        if status_code_initial != 201: 
            print(f"WARNING: Failed to publish initial status comment to PR {repo_full_name}#{pull_number}: {msg_initial} (Status: {status_code_initial})")

        files_actually_processed_for_llm = 0
        errors_during_overall_review = False

        for idx, file_info in enumerate(reviewable_files):
            current_file_num_for_comment = idx + 1
            filename = file_info['filename']
            print(f"INFO: Processing file {current_file_num_for_comment}/{num_reviewable_files}: {filename} in PR {repo_full_name}#{pull_number}")
            
            comment_text: Optional[str] = None
            analysis_type = "Code Analysis" 
            is_llm_analyzed_file = False

            try:
                if filename.endswith("requirements.txt") and file_info.get('new_content'):
                    analysis_type = "Vulnerability Scan"
                    print(f"INFO: Performing {analysis_type} for {filename}")
                    scan_result = self.vulnerability_scanner.check_vulnerabilities(file_info['new_content'])
                    comment_text = scan_result.get("response") if isinstance(scan_result, dict) else str(scan_result)
                elif file_info.get('new_content'): 
                    analysis_type = "LLM Code Review (New Content)"
                    print(f"INFO: Performing {analysis_type} for {filename}")
                    if file_info.get('status') == 'modified' and file_info.get('old_content'):
                        llm_response = self.llm.analyze_source_and_target_file(
                            file_info['old_content'], file_info['new_content'], filename
                        )
                    else: 
                        llm_response = self.llm.analyze_source_file(file_info['new_content'], filename)
                    comment_text = llm_response.get("response") if isinstance(llm_response, dict) else str(llm_response)
                    if comment_text: is_llm_analyzed_file = True
                elif file_info.get('patch'): 
                    analysis_type = "LLM Code Review (Patch Only)"
                    print(f"INFO: Performing {analysis_type} on patch for {filename}")
                    llm_response = self.llm.analyze_source_file(file_info['patch'], filename) 
                    comment_text = llm_response.get("response") if isinstance(llm_response, dict) else str(llm_response)
                    if comment_text: is_llm_analyzed_file = True
                else:
                    print(f"INFO: Skipped detailed analysis for {filename} - no suitable content (new_content or patch) found.")
                    continue 

                if comment_text and comment_text.strip(): 
                    status_pub, msg_pub = self.publish_pull_request_comment(
                        repo_full_name, pull_number, comment_text, filename,
                        current_file_num=current_file_num_for_comment, total_files_num=num_reviewable_files
                    )
                    if status_pub != 201:
                        errors_during_overall_review = True
                        print(f"ERROR: Failed to publish {analysis_type} comment for {filename}: {msg_pub} (Status: {status_pub})")
                    else:
                        print(f"INFO: Successfully published {analysis_type} comment for {filename}")
                        if is_llm_analyzed_file: 
                            self._increment_project_metrics(repo_full_name, files_analyzed_increment=1)
                            files_actually_processed_for_llm +=1
                else:
                    print(f"INFO: No comment text generated by {analysis_type} for {filename}, or comment was empty.")

            except HTTPException as http_exc: 
                errors_during_overall_review = True
                print(f"ERROR: HTTPException during {analysis_type} for {filename}: Status {http_exc.status_code}, Detail: {http_exc.detail}")
                self.publish_pull_request_comment(repo_full_name, pull_number, f"⚠️ Error during {analysis_type} for `{filename}`: {str(http_exc.detail)[:200]}...", filename, current_file_num_for_comment, num_reviewable_files)
            except Exception as general_error: 
                errors_during_overall_review = True
                print(f"ERROR: Unexpected error during {analysis_type} for {filename}: {type(general_error).__name__} - {general_error}")
                traceback.print_exc()
                self.publish_pull_request_comment(repo_full_name, pull_number, f"⚠️ CodeReview-Assistant: An unexpected error occurred while analyzing `{filename}`. Please check server logs.", filename, current_file_num_for_comment, num_reviewable_files)

        final_comment_body = f"🤖 CodeReview-Assistant: Review complete. Analyzed **{files_actually_processed_for_llm}/{num_reviewable_files}** file(s) with the LLM."
        
        non_llm_analyzed_count = num_reviewable_files - files_actually_processed_for_llm
        if non_llm_analyzed_count > 0:
             final_comment_body += f" ({non_llm_analyzed_count} file(s) might have been processed by other tools like vulnerability scanners, or skipped if no content was available for LLM analysis)."

        if errors_during_overall_review:
            final_comment_body += "\n\n⚠️ Some errors occurred during the review. Please check individual file comments or application logs for more details."
        else:
            final_comment_body += "\n\nAll reviewable files processed. Please see individual comments above for details if any were generated."
            
        status_code_final, msg_final = self.publish_pull_request_comment(repo_full_name, pull_number, final_comment_body)
        if status_code_final != 201:
            print(f"WARNING: Failed to publish final completion comment to PR {repo_full_name}#{pull_number}: {msg_final} (Status: {status_code_final})")

        if errors_during_overall_review:
            return 500, "Review completed with one or more errors."
        else:
            return 200, "Review successfully processed and all comments posted."
        
    def create_repository_webhook(self, repo_full_name: str, webhook_payload_url: str, webhook_secret: str, events: Optional[List[str]] = None) -> Tuple[bool, str, Optional[int]]:
        print(f"--- GitHubHelper: Creating/Verifying webhook for {repo_full_name} ---")
        if not webhook_payload_url:
            return False, "Webhook payload URL is required but not provided.", None
        if not webhook_secret: 
            return False, "Webhook secret is required but not provided.", None
        
        if events is None: events = ["pull_request"] 
        hook_id: Optional[int] = None

        try:
            repo = self.g.get_repo(repo_full_name)
            
            existing_hooks = repo.get_hooks()
            for hook in existing_hooks:
                if hook.name == "web" and hook.config.get("url") == webhook_payload_url:
                    print(f"Webhook with URL {webhook_payload_url} already exists for {repo_full_name} (ID: {hook.id}). Verifying configuration...")
                    hook_id = hook.id
                    updated_needed = False
                    if not hook.active: 
                        updated_needed = True
                    
                    if updated_needed or set(hook.events) != set(events):
                        print(f"Updating existing webhook {hook.id} for {repo_full_name}. Active: {hook.active}->True, Events: {hook.events}->{events}")
                        hook.edit(
                            name="web", 
                            config={"url": webhook_payload_url, "content_type": "json", "secret": webhook_secret, "insecure_ssl": "0"}, 
                            events=events, 
                            active=True
                        )
                        return True, f"Successfully updated existing webhook (ID: {hook.id}) for {repo_full_name}.", hook.id
                    return True, f"Webhook (ID: {hook.id}) already exists and appears correctly configured for {repo_full_name}.", hook.id

            print(f"Attempting to create new webhook for {repo_full_name} with URL {webhook_payload_url}, events {events}...")
            config = {
                "url": webhook_payload_url, 
                "content_type": "json", 
                "secret": webhook_secret,
                "insecure_ssl": "0" 
            }
            new_hook = repo.create_hook(name="web", config=config, events=events, active=True)
            hook_id = new_hook.id
            print(f"Successfully created webhook for {repo_full_name}. Hook ID: {new_hook.id}")
            return True, f"Successfully created webhook for {repo_full_name}.", new_hook.id
            
        except GithubException as e:
            error_message = e.data.get("message", str(e)) if hasattr(e, 'data') and isinstance(e.data, dict) else str(e)
            status_code = e.status if isinstance(e.status, int) else 500
            print(f"GitHub API error creating/managing webhook for {repo_full_name}: Status {status_code}, Message: {error_message}")
            
            if status_code == 422: 
                errors_list = e.data.get("errors", []) if hasattr(e, 'data') and isinstance(e.data, dict) else []
                if any("Hook already exists" in str(err_item.get("message", "") if isinstance(err_item, dict) else err_item) for err_item in errors_list):
                    return False, "Webhook setup failed: GitHub reported a validation error (possibly 'Hook already exists' but wasn't found in initial check).", None 
                error_message = f"Validation failed while creating webhook: {error_message}"
            elif status_code == 403: error_message = "Permission denied for webhook management on this repository."
            elif status_code == 404: error_message = f"Repository '{repo_full_name}' not found or access denied for webhook management."
            return False, f"Failed to create/manage webhook: {error_message}", None
        except Exception as e_other:
            print(f"Unexpected error creating/managing webhook for {repo_full_name}: {type(e_other).__name__} - {e_other}")
            traceback.print_exc()
            return False, f"Unexpected error creating/managing webhook: {str(e_other)}", None

    async def handle_github_webhook(self, request: Request):
        try: 
            payload = await request.json()
        except json.JSONDecodeError: 
            print("Webhook Error: Invalid JSON payload received.")
            return 400, "Invalid JSON payload." 
        except Exception as e_json: 
            print(f"Webhook Error: Could not parse JSON payload: {e_json}")
            return 400, f"Error parsing JSON payload: {e_json}"

        event_type = request.headers.get("X-GitHub-Event")
        delivery_id = request.headers.get("X-GitHub-Delivery") 
        print(f"--- GitHubHelper: Received webhook. Event: '{event_type}', Delivery ID: '{delivery_id}' ---")

        if event_type != "pull_request":
            print(f"Ignoring non-pull_request event: '{event_type}'")
            return 200, f"Event '{event_type}' received and ignored. Only 'pull_request' events are processed."

        action = payload.get("action")
        pr_data = payload.get("pull_request")
        repo_data = payload.get("repository")

        if not action or not pr_data or not repo_data:
            print("Webhook Error: Missing 'action', 'pull_request', or 'repository' data in payload.")
            return 400, "Missing essential data in pull_request event payload."

        repo_full_name = repo_data.get("full_name")
        pull_number = pr_data.get("number")
        pr_state = pr_data.get("state") 
        is_draft = pr_data.get("draft", False) 
        pr_title = pr_data.get("title", "").lower() 

        if not repo_full_name or not isinstance(pull_number, int):
            print("Webhook Error: Missing 'repository.full_name' or 'pull_request.number' in payload.")
            return 400, "Missing repository full name or pull request number in payload."

        print(f"Processing PR Event: Repo='{repo_full_name}', PR#='{pull_number}', Action='{action}', State='{pr_state}', Draft='{is_draft}'")

        trigger_actions = ["opened", "reopened", "synchronize", "ready_for_review"]
        
        if action in trigger_actions and pr_state == "open" and not is_draft:
            if "wip" in pr_title or "[draft]" in pr_title: 
                print(f"PR {repo_full_name}#{pull_number} action '{action}' skipped: Title indicates Work-In-Progress or Draft.")
                return 200, "Action skipped: Pull request title indicates WIP/Draft."

            print(f"Relevant PR action '{action}' for {repo_full_name}#{pull_number}. Initiating code review process.")
            try:
                status, msg = self.get_comments_from_pr_changes(repo_full_name, pull_number)
                print(f"Review process for {repo_full_name}#{pull_number} completed with status {status}: {msg}")
                return status if 200 <= status < 300 else 500, msg 
            except Exception as e_review_process: 
                print(f"Critical Error during webhook processing for {repo_full_name}#{pull_number}: {type(e_review_process).__name__} - {e_review_process}")
                traceback.print_exc()
                return 500, f"Internal server error during webhook processing: {str(e_review_process)}"
        
        elif is_draft:
            print(f"PR {repo_full_name}#{pull_number} action '{action}' skipped: Pull request is currently a draft.")
            return 200, "Action skipped: Pull request is a draft."
        elif pr_state == "closed":
            print(f"PR {repo_full_name}#{pull_number} action '{action}' skipped: Pull request is closed.")
            return 200, "Action skipped: Pull request is closed."
        else: 
            print(f"No action taken for PR event action '{action}' on {repo_full_name}#{pull_number} (State: {pr_state}, Draft: {is_draft}).")
            return 200, f"No action taken for PR event action '{action}' under current conditions."
