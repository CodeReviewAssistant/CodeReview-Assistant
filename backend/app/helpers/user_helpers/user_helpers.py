# --- Existing Imports ---
from fastapi.responses import JSONResponse, RedirectResponse
# from app.config.config import settings # Assuming this is correctly set up
from urllib.parse import urlencode
from fastapi import APIRouter, Response, Depends, HTTPException, Request
# from app.helpers.merge_request_helper import MergeRequestHelper # Defined inline below now
from typing import Any, Dict, List, Optional, Union
# from pydantic import validator # Not used here
# from pydantic_settings import BaseSettings # Defined in config.py presumably
import os
import requests
import urllib.parse

# --- Import your settings ---
# Make sure this settings object has all required fields
#

# --- LLM Class Definition or Import ---
# Ensure the LLM class using Google API (from previous prompt) is defined here or imported
# Example import:
# from app.services.llm import LLM
#
# class LLM:
#     # ... Full definition ...
#     pass
# -----------------------------------

# --- Disable InsecureRequestWarning if using verify=False ---
import urllib3

from app.api.git import LLM
from backend.app.helpers.github_helper import GITLAB_TOKEN
from app.api.auth import GITLAB_CLIENT_ID, GITLAB_CLIENT_SECRET, GITLAB_OAUTH_URL, GITLAB_REDIRECT_URI, GITLAB_TOKEN_URL, GITLAB_USER_API
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
# -------------------------------------------------------------


# --- MergeRequestHelper Class (Modified) ---
class MergeRequestHelper:
    def __init__(self):
        self.gitlab_token = GITLAB_TOKEN
        if not self.gitlab_token:
            raise ValueError("GITLAB_TOKEN not found in ")
        self.headers = {"PRIVATE-TOKEN": self.gitlab_token}
        # Use GITLAB_BASE_URL from settings
        self.base_url = "https://localhost/api/v4"
        # Determine if GitLab connection needs verify=False (HTTPS + localhost implies self-signed)
        self.gitlab_verify_ssl = not (self.base_url.startswith("https://localhost"))

        self.ignored_file_types = [".svg", ".png", ".ico", "README.md", ".lock"]

        try:
            # Instantiate LLM. Assumes LLM uses os.getenv("API_KEY") or similar
            # Ensure settings include API_KEY if LLM needs it differently
            self.llm = LLM()
        except ValueError as e:
            print(f"Error initializing LLM: {e}")
            raise ValueError(f"Failed to initialize LLM service: {e}") from e

    # --- Centralized Request Helper ---
    def _gitlab_request(self, method, url, **kwargs):
        """Helper for making requests to GitLab API, handling SSL verification."""
        kwargs['headers'] = self.headers
        kwargs['timeout'] = kwargs.get('timeout', 30)
        # Use determined SSL verification setting
        kwargs['verify'] = self.gitlab_verify_ssl
        try:
            response = requests.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            print(f"GitLab API Error ({method} {url}): {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response Status: {e.response.status_code}, Body: {e.response.text[:200]}")
            raise # Re-raise exception

    # --- Modified get_comment ---
    def get_comment(self, file_name: str, source_file: str, target_file: str = None):
        """Gets code review comment using the instantiated LLM service."""
        try:
            if target_file:
                print(f"Analyzing changes for: {file_name}")
                llm_response_data = self.llm.analyze_source_and_target_file(
                    original_content=target_file, changes=source_file, file_name=file_name
                )
            else:
                print(f"Analyzing new file/content for: {file_name}")
                llm_response_data = self.llm.analyze_source_file(
                    changes=source_file, file_name=file_name
                )

            comment = llm_response_data.get("response")
            if comment is None:
                print(f"Warning: LLM response missing 'response' key for {file_name}.")
                return f"Error: Could not retrieve analysis for `{file_name}`."
            return comment
        except Exception as e:
            print(f"Error calling LLM for {file_name}: {type(e).__name__} - {e}")
            return f"Error generating comment for `{file_name}` due to LLM service issue."

    # --- GitLab Methods using _gitlab_request ---
    def get_raw_file(self, project_id: str, file_path: str, branch: str):
        quoted_file_path = urllib.parse.quote(file_path, safe="")
        url = f"{self.base_url}/projects/{project_id}/repository/files/{quoted_file_path}/raw?ref={branch}"
        try:
            response = self._gitlab_request("get", url)
            return response.text
        except requests.exceptions.HTTPError as e:
             if e.response.status_code == 404:
                 print(f"Warning: File not found in branch '{branch}': {file_path}")
             # Error logged by _gitlab_request
             return None
        except Exception:
             return None

    def get_changes_and_branches(self, project_id: str, merge_request_id: str):
        url = f"{self.base_url}/projects/{project_id}/merge_requests/{merge_request_id}/changes"
        try:
            response = self._gitlab_request("get", url)
            response_data = response.json()
            return (
                response_data.get("source_branch"),
                response_data.get("target_branch"),
                response_data.get("changes"),
            )
        except ValueError: # JSONDecodeError
             print(f"Error decoding JSON for MR changes (MR !{merge_request_id})")
             return None, None, None
        except Exception:
             return None, None, None

    def publish_comment(self, comment, project_id, merge_request_id, file_name):
        url = f"{self.base_url}/projects/{project_id}/merge_requests/{merge_request_id}/notes"
        data = {"body": f"### AI Review for `{file_name}`\n\n---\n\n{comment}"}
        try:
            self._gitlab_request("post", url, json=data)
            print(f"Successfully posted comment for {file_name} to MR !{merge_request_id}")
            return 200, "Successfully posted comment"
        except Exception as e:
            return 500, f"Error Posting Comment: {str(e)}"

    # --- get_comments_from_changes (Use refined logic) ---
    def get_comments_from_changes(self, changes, project_id, source_branch, target_branch, merge_request_id):
        if not all([changes, project_id, source_branch, target_branch, merge_request_id]):
            print("Error: Missing required parameters for get_comments_from_changes.")
            return 500, "Internal error: Missing parameters."

        files_processed = 0
        errors_occurred = False
        for change in changes:
            new_file = change.get("new_file", False)
            deleted_file = change.get("deleted_file", False)
            renamed_file = change.get("renamed_file", False)
            file_path = change.get("new_path")

            if deleted_file or not file_path or any(file_path.lower().endswith(ft) for ft in self.ignored_file_types):
                continue # Skip deleted, pathless, or ignored files

            print(f"Processing change for file: {file_path}")
            files_processed += 1
            comment, source_content, target_content = None, None, None

            if new_file or renamed_file:
                source_content = self.get_raw_file(project_id, file_path, source_branch)
                if source_content is not None:
                    comment = self.get_comment(file_path, source_content, None)
                else: errors_occurred = True; print(f"Failed get content (new): {file_path}")
            else: # Modified
                source_content = self.get_raw_file(project_id, file_path, source_branch)
                target_content = self.get_raw_file(project_id, file_path, target_branch)
                if source_content is not None and target_content is not None:
                    comment = self.get_comment(file_path, source_content, target_content)
                else: errors_occurred = True; print(f"Failed get content (mod): {file_path}")

            if comment:
                status, msg = self.publish_comment(comment, project_id, merge_request_id, file_path)
                if status != 200: errors_occurred = True; print(f"Failed publish: {file_path} ({msg})")
            # Mark error if comment failed despite getting content
            elif source_content is not None and (new_file or renamed_file or target_content is not None):
                errors_occurred = True; print(f"Failed get comment: {file_path}")

        if files_processed == 0: return 200, "No reviewable files found."
        return (500, "Completed with errors.") if errors_occurred else (200, "Successfully processed changes.")

    # --- handle_merge_request_open (Use refined logic) ---
    def handle_merge_request_open(self, project_id: str, merge_request_id: str):
        print(f"Starting review process for MR !{merge_request_id}...")
        try:
            source_branch, target_branch, changes = self.get_changes_and_branches(project_id, merge_request_id)
            if changes is None or source_branch is None or target_branch is None:
                return 500, "Failed to retrieve merge request details."
            return self.get_comments_from_changes(changes, project_id, source_branch, target_branch, merge_request_id)
        except Exception as err:
            print(f"Unhandled exception in handle_merge_request_open: {err}")
            return 500, "Internal server error during merge request handling."

    # --- handle_webhook (Use refined logic - async) ---
    async def handle_webhook(self, request: Request):
        try:
            payload = await request.json()
        except Exception as json_err:
             print(f"Error decoding webhook JSON payload: {json_err}"); return 400, "Invalid JSON."
        try:
            if payload.get("object_kind") != "merge_request": return 200, "Not an MR event."

            attrs = payload.get("object_attributes", {})
            proj = payload.get("project", {})
            mr_id, proj_id = attrs.get("iid"), proj.get("id")
            action, title = attrs.get("action", ""), attrs.get("title", "").lower()
            is_draft = attrs.get("draft", False) or title.startswith(("draft:", "wip:"))

            if not mr_id or not proj_id: return 400, "Missing project/MR ID."

            print(f"Webhook: Kind='MR', Action='{action}', Proj={proj_id}, MR={mr_id}, Draft={is_draft}")
            trigger_actions = ["open", "reopen", "update"]

            if action in trigger_actions and not is_draft:
                 print(f"Processing '{action}' event for non-draft MR !{mr_id}")
                 # Run sync logic (consider async later if too slow)
                 status_code, message = self.handle_merge_request_open(proj_id, mr_id)
                 return status_code, message
            elif is_draft: return 200, "Skipped: MR is draft."
            else: return 200, f"Skipped action: {action}."
        except Exception as err:
            print(f"Error processing webhook logic: {err}"); return 500, "Internal error."

# --- End of MergeRequestHelper ---


# --- FastAPI Routers ---

# Webhook Router
webhook_router = APIRouter(
    tags=["Webhook APIs"],
    responses={404: {"description": "Not found"}},
)

from app.config.config import GITLAB_SECRET_TOKEN, Settings  # Ensure this is correctly set up

def verify_gitlab_signature(request: Request):
    """Verifies the GitLab webhook secret token."""
    signature = request.headers.get("X-Gitlab-Token")
    if not GITLAB_SECRET_TOKEN:
        raise HTTPException(status_code=500, detail="GitLab secret token is not configured.")
    if signature != GITLAB_SECRET_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid GitLab token")
    print("GitLab signature verified.") # Add verification log
    return True

@webhook_router.post("/webhook")
async def handle_webhook_route(request: Request, verified: bool = Depends(verify_gitlab_signature)):
    """Handles verified incoming GitLab webhook requests."""
    merge_request_helper = MergeRequestHelper() # Instantiates the modified helper
    try:
        status_code , message = await merge_request_helper.handle_webhook(request=request)
        # Corrected 'mesage' -> 'message'
        return JSONResponse(status_code=status_code, content={"message": message})
    except Exception as e:
        print(f"Error handling webhook route: {e}")
        # Consider logging traceback here for debugging
        # import traceback; traceback.print_exc()
        return JSONResponse(status_code=500, content={"message": "Internal server error in webhook handler."})


# Auth Router
auth_router = APIRouter(
    tags=["Auth APIs"],
    responses={404: {"description": "Not found"}},
)

@auth_router.get("/auth/login")
async def login():
    """ Redirect user to GitLab for OAuth authorization. """
    params = {
        "client_id": GITLAB_CLIENT_ID,
        "redirect_uri": GITLAB_REDIRECT_URI,
        "response_type": "code",
        "scope": "api read_api", # Ensure 'api' scope is needed; 'read_api' might be sufficient?
    }
    auth_url = f"{GITLAB_OAUTH_URL}?{urlencode(params)}"
    print(f"Redirecting user to GitLab OAuth: {GITLAB_OAUTH_URL}")
    return JSONResponse(status_code=200, content={"redirect_url": auth_url})


@auth_router.get("/auth/callback")
async def auth_callback(code: str):
    """ Handle GitLab OAuth callback, exchange code for token, fetch user, redirect. """
    token_data = {
        "client_id": GITLAB_CLIENT_ID,
        "client_secret": GITLAB_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GITLAB_REDIRECT_URI,
    }

    # Determine if SSL verification needs to be disabled for OAuth calls
    verify_token_ssl = not GITLAB_TOKEN_URL.startswith("https://localhost")
    verify_user_ssl = not GITLAB_USER_API.startswith("https://localhost")

    try:
        # --- Token Exchange ---
        print(f"Exchanging OAuth code at: {GITLAB_TOKEN_URL}")
        token_response = requests.post(
            GITLAB_TOKEN_URL, data=token_data, verify=verify_token_ssl
        )
        token_response.raise_for_status()
        token_info = token_response.json()
        access_token = token_info.get("access_token")
        if not access_token: raise ValueError("access_token missing from response")
        print(f"OAuth: Obtained access token (Expires in: {token_info.get('expires_in', 'N/A')}s)")

        # --- Fetch User Info ---
        print(f"Fetching user info from: {GITLAB_USER_API}")
        headers = {"Authorization": f"Bearer {access_token}"}
        user_response = requests.get(
            GITLAB_USER_API, headers=headers, verify=verify_user_ssl
        )
        user_response.raise_for_status()
        user_info = user_response.json()
        print(f"OAuth: Fetched user info for '{user_info.get('username')}'")

        # --- Redirect to Frontend ---
        redirect_url = getattr(Settings, "FRONTEND_URL", "http://localhost:3000/")
        response = RedirectResponse(url=redirect_url)

        # Determine if cookie should be secure (based on frontend URL)
        is_secure_cookie = redirect_url.startswith("https://")
        print(f"Redirecting to frontend: {redirect_url} (Secure cookie: {is_secure_cookie})")

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,       # Recommended for security
            samesite='Lax',      # Recommended default
            secure=is_secure_cookie,
            max_age=token_info.get('expires_in'), # Set cookie expiry based on token lifetime
            path="/"             # Ensure cookie is available across the frontend domain
        )
        return response

    except requests.exceptions.RequestException as e:
         # Log detailed error from GitLab if possible
         gitlab_error_msg = f"GitLab communication error during OAuth: {e}."
         if hasattr(e, 'response') and e.response is not None:
              print(f"GitLab Response Status: {e.response.status_code}")
              print(f"GitLab Response Body: {e.response.text[:500]}")
              try:
                 error_json = e.response.json()
                 gitlab_error_msg += f" Detail: {error_json.get('error_description', e.response.text[:100])}"
              except ValueError: pass # Response not JSON
              status_code = 400 if e.response.status_code < 500 else 502 # Use 400 for client errors, 502 for server/network
              return JSONResponse(status_code=status_code, content={"message": gitlab_error_msg})
         return JSONResponse(status_code=502, content={"message": f"Network error communicating with GitLab: {e}"})
    except ValueError as e: # Catch missing access_token etc.
        print(f"OAuth value error: {e}")
        return JSONResponse(status_code=500, content={"message": f"Internal error processing GitLab response: {e}"})
    except Exception as e:
        print(f"Unexpected OAuth Error: {e}")
        # import traceback; traceback.print_exc() # Uncomment for detailed trace
        return JSONResponse(status_code=500, content={"message": "Internal server error during authentication."})


# --- Include Routers in your main FastAPI app ---
# In your main application file (e.g., main.py):
# from fastapi import FastAPI
# app = FastAPI()
# app.include_router(webhook_router)
# app.include_router(auth_router)
# -------------------------------------------------