import os
import traceback
import json
from app.api.webhook import BOT_GITHUB_PERMANENT_TOKEN
import redis
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError as PydanticValidationError # Import Pydantic's own ValidationError
from github import GithubException, BadCredentialsException

from app.helpers.github_helper import GitHubHelper
from app.schemas.users_schema import ProjectDetailsResponse, BotAddSchema

from dotenv import load_dotenv
load_dotenv()

# ... (rest of your imports and global variable definitions remain the same) ...
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB_PROJECTS = int(os.getenv("REDIS_DB_PROJECTS", 2))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

BOT_GITHUB_USERNAME = os.getenv("BOT_GITHUB_USERNAME")
APP_WEBHOOK_PAYLOAD_URL = os.getenv("APP_WEBHOOK_PAYLOAD_URL")
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
INTERNAL_SERVICE_TOKEN_ENV = os.getenv("INTERNAL_SERVICE_TOKEN")

router = APIRouter(
    prefix="/users",
    tags=["Users APIs (GitHub) & Project Data"],
    responses={404: {"description": "Not found"}},
)

redis_client_projects = None
try:
    redis_client_projects = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB_PROJECTS,
        decode_responses=True,
        password=REDIS_PASSWORD
    )
    redis_client_projects.ping()
    print(f"Successfully connected to Redis for Project Data on DB {REDIS_DB_PROJECTS}!")
except redis.exceptions.ConnectionError as e:
    print(f"CRITICAL ERROR: Could not connect to Redis for Project Data: {e}")
    redis_client_projects = None
except redis.exceptions.AuthenticationError as e:
    print(f"CRITICAL ERROR: Redis authentication failed for Project Data: {e}")
    redis_client_projects = None
except Exception as e_redis_generic:
    print(f"CRITICAL ERROR: An unexpected error occurred while connecting to Redis for Project Data: {e_redis_generic}")
    redis_client_projects = None


PROJECT_DATA_DB_KEY = "projects_data_v2"

class ProjectMetricsModel(BaseModel):
    files_analyzed: int = 0
    pull_requests_analyzed: int = 0
    pull_requests_merged: int = 0
    pull_requests_closed: int = 0
    pull_requests_open: int = 0

class ProjectStatusModel(BaseModel):
    bot_status: str = "not_added"
    webhook_status: str = "not_configured"

class ProjectModel(BaseModel):
    id: str
    name_with_namespace: str
    html_url: Optional[str] = None
    description: Optional[str] = None
    status: ProjectStatusModel = ProjectStatusModel()
    metrics: ProjectMetricsModel = ProjectMetricsModel()
    last_updated: str = datetime.utcnow().isoformat()

class ProjectMetricsIncrementModel(BaseModel):
    files_analyzed_increment: int = 0
    pull_requests_analyzed_increment: int = 0

def get_project_data_from_redis(project_full_name: str) -> Optional[ProjectModel]:
    if not redis_client_projects:
        print("WARNING: Redis client for projects not available in get_project_data_from_redis.")
        return None
    try:
        project_json = redis_client_projects.hget(PROJECT_DATA_DB_KEY, project_full_name)
        if project_json:
            return ProjectModel(**json.loads(project_json))
    except redis.exceptions.RedisError as e:
        print(f"RedisError in get_project_data_from_redis for {project_full_name}: {e}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON for project {project_full_name} from Redis.")
    return None

def store_project_data_in_redis(project_data: ProjectModel) -> bool:
    if not redis_client_projects:
        print("WARNING: Redis client for projects not available in store_project_data_in_redis.")
        return False
    try:
        project_data.last_updated = datetime.utcnow().isoformat()
        redis_client_projects.hset(
            PROJECT_DATA_DB_KEY,
            project_data.name_with_namespace,
            project_data.model_dump_json()
        )
        return True
    except redis.exceptions.RedisError as e:
        print(f"RedisError storing project data for {project_data.name_with_namespace}: {e}")
    except Exception as e: # Catch generic exceptions during model dump or hset
        print(f"Error storing project data for {project_data.name_with_namespace} in Redis: {e}")
    return False

def _determine_real_status(helper: GitHubHelper, repo_full_name: str) -> ProjectStatusModel:
    bot_status = "unknown" # Default status
    webhook_status = "unknown" # Default status
    current_repo_obj = None

    try:
        current_repo_obj = helper.g.get_repo(repo_full_name)
    except GithubException as ge_repo:
        print(f"WARNING (_determine_real_status): Could not fetch repo object for {repo_full_name}: {ge_repo.status} {ge_repo.data.get('message', '')}")
        return ProjectStatusModel(bot_status="unknown_repo_fetch_error", webhook_status="unknown_repo_fetch_error")

    if BOT_GITHUB_USERNAME:
        try:
            if current_repo_obj.has_in_collaborators(BOT_GITHUB_USERNAME):
                bot_status = "added"
            else:
                bot_status = "not_added"
        except GithubException as ge_collab:
            print(f"WARNING (_determine_real_status): Could not check collaborator status for {BOT_GITHUB_USERNAME} in {repo_full_name}: {ge_collab.status} {ge_collab.data.get('message', '')}")
            bot_status = "unknown_collab_check_error"
    else:
        print("WARNING (_determine_real_status): BOT_GITHUB_USERNAME not configured on server.")
        bot_status = "config_missing_bot_username"

    if not APP_WEBHOOK_PAYLOAD_URL:
        print("WARNING (_determine_real_status): APP_WEBHOOK_PAYLOAD_URL not configured on server.")
        webhook_status = "config_missing_webhook_url"
    else:
        webhook_status = "not_configured" # Assume not configured until found
        try:
            hooks = current_repo_obj.get_hooks()
            found_hook = False
            for hook in hooks:
                if hook.name == "web" and hook.config.get("url") == APP_WEBHOOK_PAYLOAD_URL:
                    webhook_status = "active" if hook.active else "inactive"
                    found_hook = True
                    break
            if not found_hook:
                 webhook_status = "not_configured" # Explicitly set if no matching hook found
        except GithubException as ge_hook:
            print(f"WARNING (_determine_real_status): Could not fetch hooks for {repo_full_name}: {ge_hook.status} {ge_hook.data.get('message', '')}")
            webhook_status = "unknown_hook_fetch_error"
            
    return ProjectStatusModel(bot_status=bot_status, webhook_status=webhook_status)

def handle_github_exception(e: GithubException):
    """Handles PyGithub's GithubException and extracts details."""
    if hasattr(e, 'status') and hasattr(e, 'data') and isinstance(e.data, dict):
        error_detail = e.data.get('message', str(e))
        http_status_code = e.status if isinstance(e.status, int) and 400 <= e.status < 600 else 500
        return http_status_code, error_detail
    return 500, f"An unexpected GitHub error occurred: {str(e)}"

@router.post('/projects')
async def get_github_repositories(access_token: Optional[str] = Cookie(None)):
    if not access_token:
        raise HTTPException(
            status_code=401, 
            detail="GitHub access token missing in cookies. Please login."
        )
    if not redis_client_projects:
        raise HTTPException(status_code=503, detail="Project data service temporarily unavailable (Redis connection).")

    helper: Optional[GitHubHelper] = None
    try:
        helper = GitHubHelper(user_github_token=access_token)
        user_login = helper.user.login if helper.user else "unknown_user"
        print(f"Fetching GitHub repositories for user: {user_login}") # VERIFY THIS LOG
        
        github_repos_list = helper.get_user_repositories()
        
        projects_to_return = []
        for gh_repo_data in github_repos_list:
            project_full_name = gh_repo_data['name_with_namespace']
            current_real_status = _determine_real_status(helper, project_full_name)
            project_data_redis = get_project_data_from_redis(project_full_name)
            
            if project_data_redis:
                if (project_data_redis.status != current_real_status or
                    project_data_redis.html_url != gh_repo_data.get('html_url') or
                    project_data_redis.description != gh_repo_data.get('description')):
                    
                    print(f"INFO: Project data for {project_full_name} changed. Updating Redis.")
                    project_data_redis.status = current_real_status
                    project_data_redis.html_url = gh_repo_data.get('html_url', project_data_redis.html_url)
                    project_data_redis.description = gh_repo_data.get('description', project_data_redis.description)
                    store_project_data_in_redis(project_data_redis)
                projects_to_return.append(project_data_redis.model_dump())
            else:
                print(f"INFO: Project {project_full_name} not found in Redis. Initializing.")
                new_project_entry = ProjectModel(
                    id=str(gh_repo_data['id']), 
                    name_with_namespace=project_full_name,
                    html_url=gh_repo_data.get('html_url'),
                    description=gh_repo_data.get('description'),
                    status=current_real_status,
                    metrics=ProjectMetricsModel()
                )
                store_project_data_in_redis(new_project_entry)
                projects_to_return.append(new_project_entry.model_dump())
                
        return JSONResponse(status_code=200, content={"status": "success", "projects": projects_to_return})

    except ValueError as ve_helper_init: 
        if "GitHub token" in str(ve_helper_init) or "Bad credentials" in str(ve_helper_init):
            print(f"GitHubHelper initialization failed for /projects: {ve_helper_init}")
            raise HTTPException(status_code=401, detail=f"Invalid or expired GitHub token. Please reconnect GitHub. Error: {ve_helper_init}")
        else:
            print(f"ValueError in /projects: {ve_helper_init}")
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Invalid request data: {str(ve_helper_init)}")
            
    except BadCredentialsException as bce: 
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user (token issue)"
        print(f"GitHub BadCredentialsException for user {user_login_for_log} in /projects: {bce.status} {bce.data.get('message','')}")
        raise HTTPException(status_code=401, detail="Invalid or expired GitHub token. Please reconnect GitHub.")
        
    except GithubException as ge:
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user"
        status_code, error_detail = handle_github_exception(ge)
        print(f"GitHubException for user {user_login_for_log} in /projects: {status_code} {error_detail}")
        raise HTTPException(status_code=status_code, detail=error_detail)
        
    except Exception as e:
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user"
        print(f"Unexpected error for user {user_login_for_log} in /projects: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")


@router.get('/projects/{owner}/{repo_name}/details', response_model=ProjectDetailsResponse)
async def get_project_details_endpoint(
    owner: str,
    repo_name: str,
    access_token: Optional[str] = Cookie(None)
):
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token missing. Please login.")
    if not redis_client_projects:
        raise HTTPException(status_code=503, detail="Project data service temporarily unavailable.")
    
    project_full_name = f"{owner}/{repo_name}"
    helper: Optional[GitHubHelper] = None
    try:
        helper = GitHubHelper(user_github_token=access_token)
        user_login = helper.user.login if helper.user else "unknown_user"
        # **** CHECK THIS LOG IN YOUR SERVER OUTPUT ****
        print(f"LATEST CODE CHECKPOINT 1: Fetching details for {project_full_name} for user {user_login}.")
        
        repo_obj = helper.g.get_repo(project_full_name)
        
        open_pr_count = repo_obj.get_pulls(state='open').totalCount
        merged_pr_count = helper.g.search_issues(query=f"repo:{project_full_name} type:pr is:merged").totalCount
        closed_unmerged_pr_count = helper.g.search_issues(query=f"repo:{project_full_name} type:pr is:closed is:unmerged").totalCount
        
        project_data_redis = get_project_data_from_redis(project_full_name)
        metrics_to_return: ProjectMetricsModel

        if project_data_redis:
            project_data_redis.metrics.pull_requests_open = open_pr_count
            project_data_redis.metrics.pull_requests_merged = merged_pr_count
            project_data_redis.metrics.pull_requests_closed = closed_unmerged_pr_count
            store_project_data_in_redis(project_data_redis)
            metrics_to_return = project_data_redis.metrics
        else:
            print(f"INFO: Project {project_full_name} not in Redis during details fetch. Initializing with live metrics.")
            project_status = _determine_real_status(helper, project_full_name)
            new_project_entry = ProjectModel(
                 id=str(repo_obj.id), 
                 name_with_namespace=project_full_name,
                 html_url=repo_obj.html_url, 
                 description=repo_obj.description, 
                 status=project_status, 
                 metrics=ProjectMetricsModel( 
                     pull_requests_open=open_pr_count,
                     pull_requests_merged=merged_pr_count, 
                     pull_requests_closed=closed_unmerged_pr_count,
                     files_analyzed=0,
                     pull_requests_analyzed=0
                 )
            )
            store_project_data_in_redis(new_project_entry)
            metrics_to_return = new_project_entry.metrics
        
        print(f"LATEST CODE CHECKPOINT 2: metrics_to_return type is {type(metrics_to_return)}, value: {metrics_to_return!r}")

        # Manually create the dictionary for the 'details' field
        manual_details_dict = {
            "files_analyzed": metrics_to_return.files_analyzed,
            "pull_requests_analyzed": metrics_to_return.pull_requests_analyzed,
            "pull_requests_merged": metrics_to_return.pull_requests_merged,
            "pull_requests_closed": metrics_to_return.pull_requests_closed,
            "pull_requests_open": metrics_to_return.pull_requests_open
        }
        print(f"LATEST CODE CHECKPOINT 3: Manually constructed details_dict: {manual_details_dict}")
        
        # Try to instantiate ProjectDetailsResponse directly here to catch the error more precisely
        try:
            response_object = ProjectDetailsResponse(status="success", details=manual_details_dict)
            print(f"LATEST CODE CHECKPOINT 4: Successfully instantiated ProjectDetailsResponse with manual_details_dict: {response_object!r}")
            return response_object
        except PydanticValidationError as pve: # Catch Pydantic's own validation error
            print(f"CRITICAL PYDANTIC ERROR during manual instantiation of ProjectDetailsResponse:")
            print(f"Error details: {pve.errors()}") # Get detailed errors
            # You might want to raise an HTTPException here based on pve,
            # or let FastAPI handle it if it re-raises, but logging pve.errors() is key.
            raise # Re-raise the caught Pydantic error to see its full context
        except Exception as e_constr:
            print(f"CRITICAL OTHER ERROR during manual instantiation of ProjectDetailsResponse: {type(e_constr).__name__} - {e_constr}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Server error during response construction: {e_constr}")


    except ValueError as ve_helper_init:
        if "GitHub token" in str(ve_helper_init) or "Bad credentials" in str(ve_helper_init):
            print(f"GitHubHelper initialization failed for /details ({project_full_name}): {ve_helper_init}")
            raise HTTPException(status_code=401, detail=f"Invalid or expired GitHub token. Error: {ve_helper_init}")
        else:
            print(f"ValueError in /details ({project_full_name}): {ve_helper_init}")
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Invalid request: {str(ve_helper_init)}")

    except BadCredentialsException as bce:
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user"
        print(f"GitHub BadCredentialsException for user {user_login_for_log} in /details ({project_full_name}): {bce.status} {bce.data.get('message','')}")
        raise HTTPException(status_code=401, detail="Invalid or expired GitHub token.")
        
    except GithubException as ge:
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user"
        if ge.status == 404:
            print(f"Project {project_full_name} not found or access denied for user {user_login_for_log}.")
            raise HTTPException(status_code=404, detail=f"Project {project_full_name} not found or access denied.")
        status_code, error_detail = handle_github_exception(ge)
        print(f"GitHubException for user {user_login_for_log} in /details ({project_full_name}): {status_code} {error_detail}")
        raise HTTPException(status_code=status_code, detail=error_detail)
        
    except Exception as e: # This will now catch the PydanticValidationError if re-raised above
        user_login_for_log = helper.user.login if helper and helper.user else "unknown_user"
        print(f"General Exception in /details for user {user_login_for_log}, project {project_full_name}: {type(e).__name__} - {str(e)}")
        # If it's the Pydantic error we've been seeing, it will be caught here if re-raised from the try-except block for ProjectDetailsResponse instantiation.
        traceback.print_exc()
        raise # Re-raise it so FastAPI gives the 500, or handle more gracefully

# ... (rest of your users.py: /bot/add and /internal/.../increment_metrics)
# Ensure these functions also use the updated logging for user_login if applicable.

@router.post('/bot/add')
async def add_bot_to_github_repository_endpoint(
    data: BotAddSchema,
    access_token: Optional[str] = Cookie(None)
):
    if not access_token:
        raise HTTPException(status_code=401, detail="GitHub access token missing. Please login.")
    if not redis_client_projects:
        raise HTTPException(status_code=503, detail="Project data service temporarily unavailable.")
    
    repo_full_name_to_add = data.project_id
    if not repo_full_name_to_add or '/' not in repo_full_name_to_add:
        raise HTTPException(status_code=400, detail="Valid repository identifier (e.g., owner/repo_name) is required as project_id.")

    helper: Optional[GitHubHelper] = None
    user_login = "unknown_user"

    try:
        helper = GitHubHelper(user_github_token=access_token)
        user_login = helper.user.login if helper.user else "unknown_user_after_init_attempt"
        print(f"User {user_login} attempting to add bot to repository: {repo_full_name_to_add}")

        if not BOT_GITHUB_USERNAME:
            print("CRITICAL_SERVER_CONFIG_ERROR: BOT_GITHUB_USERNAME is not configured.")
            raise HTTPException(status_code=500, detail="Bot integration feature is not properly configured on the server (missing bot username).")
        
        invite_success, invite_message, invitation_id = helper.add_user_as_collaborator(
            repo_full_name=repo_full_name_to_add, username=BOT_GITHUB_USERNAME, permission="push"
        )
        current_overall_message = invite_message
        bot_on_repo_ok = False

        if invite_success:
            if invitation_id is not None:
                if not BOT_GITHUB_PERMANENT_TOKEN:
                    current_overall_message += " Bot invitation sent. Auto-acceptance skipped (Bot PAT not configured on server)."
                    temp_repo_obj = helper.g.get_repo(repo_full_name_to_add)
                    if temp_repo_obj.has_in_collaborators(BOT_GITHUB_USERNAME):
                        bot_on_repo_ok = True
                        current_overall_message = f"Bot ({BOT_GITHUB_USERNAME}) is now a collaborator on {repo_full_name_to_add}."
                else:
                    try:
                        bot_helper = GitHubHelper(user_github_token=BOT_GITHUB_PERMANENT_TOKEN)
                        accept_success, accept_message = bot_helper.accept_repository_invitation(invitation_id)
                        if accept_success:
                            bot_on_repo_ok = True
                            current_overall_message = f"Bot successfully added to {repo_full_name_to_add} (invitation auto-accepted)."
                        else:
                            current_overall_message = f"Invitation sent to bot, but auto-accept failed: {accept_message}"
                    except ValueError as ve_bot_helper: # Catch issues with BOT_GITHUB_PERMANENT_TOKEN
                         current_overall_message += f" Bot auto-accept failed: Bot helper could not be initialized ({ve_bot_helper}). Check bot PAT."
                    except Exception as e_accept:
                        current_overall_message += f" Error during bot auto-acceptance: {str(e_accept)}"
            else: # No invitation ID means user was already a collaborator or became one directly
                bot_on_repo_ok = True 
        
        webhook_created_successfully = False 
        if bot_on_repo_ok: 
            if APP_WEBHOOK_PAYLOAD_URL and GITHUB_WEBHOOK_SECRET:
                try:
                    wh_success, wh_msg, _ = helper.create_repository_webhook( 
                        repo_full_name=repo_full_name_to_add, 
                        webhook_payload_url=APP_WEBHOOK_PAYLOAD_URL,
                        webhook_secret=GITHUB_WEBHOOK_SECRET, 
                        events=["pull_request"] 
                    )
                    if wh_success:
                        webhook_created_successfully = True
                        current_overall_message += f" {wh_msg}" 
                    else:
                        current_overall_message += f" Webhook setup failed: {wh_msg}"
                except Exception as e_wh:
                    current_overall_message += f" Error creating webhook: {str(e_wh)}"
            else:
                current_overall_message += " Webhook setup skipped (server configuration for webhook URL or secret missing)."
        else:
            current_overall_message += " Webhook setup skipped (bot not successfully added as collaborator)."


        gh_repo_obj = None
        try: 
            gh_repo_obj = helper.g.get_repo(repo_full_name_to_add)
        except GithubException as e_gh_repo:
            print(f"WARNING (/bot/add): Could not fetch GitHub repo details for {repo_full_name_to_add} after operations: {e_gh_repo.status} {e_gh_repo.data.get('message','')}")

        real_status_after_ops = _determine_real_status(helper, repo_full_name_to_add) 
        
        project_data = get_project_data_from_redis(repo_full_name_to_add)
        if not project_data:
            project_id_for_new = str(gh_repo_obj.id) if gh_repo_obj else "unknown_id_" + repo_full_name_to_add.replace("/", "_")
            project_data = ProjectModel(
                id=project_id_for_new,
                name_with_namespace=repo_full_name_to_add,
                html_url=gh_repo_obj.html_url if gh_repo_obj else None,
                description=gh_repo_obj.description if gh_repo_obj else None,
                status=real_status_after_ops, 
                metrics=ProjectMetricsModel() 
            )
        else: 
            project_data.status = real_status_after_ops
            if gh_repo_obj: 
                project_data.html_url = gh_repo_obj.html_url
                project_data.description = gh_repo_obj.description
            
        if not store_project_data_in_redis(project_data):
            current_overall_message += " (Warning: Failed to update project data in Redis)"
        
        final_http_status_code = 400 
        response_status_str = "failure"

        if project_data.status.bot_status == "added":
            if project_data.status.webhook_status == "active":
                final_http_status_code = 200 
                response_status_str = "success"
            else:
                final_http_status_code = 207 
                response_status_str = "success" 
        else: 
             final_http_status_code = 400 

        return JSONResponse(
            status_code=final_http_status_code, 
            content={
                "status": response_status_str, 
                "message": current_overall_message,
                "updated_project_status": project_data.status.model_dump() 
            }
        )

    except ValueError as ve_helper_init: 
        if "GitHub token" in str(ve_helper_init) or "Bad credentials" in str(ve_helper_init):
            print(f"GitHubHelper initialization failed for /bot/add (user: {user_login}, repo: {repo_full_name_to_add}): {ve_helper_init}")
            raise HTTPException(status_code=401, detail=f"Invalid or expired GitHub token. Error: {ve_helper_init}")
        else: 
            print(f"ValueError in /bot/add (user: {user_login}, repo: {repo_full_name_to_add}): {ve_helper_init}")
            traceback.print_exc()
            raise HTTPException(status_code=400, detail=f"Invalid request or configuration error: {str(ve_helper_init)}")

    except BadCredentialsException as bce: 
        print(f"GitHub BadCredentialsException for user {user_login} in /bot/add (repo: {repo_full_name_to_add}): {bce.status} {bce.data.get('message','')}")
        raise HTTPException(status_code=401, detail="Invalid or expired GitHub token (user or bot). Please check credentials.")
        
    except GithubException as ge:
        status_code, error_detail = handle_github_exception(ge)
        print(f"GitHubException for user {user_login} in /bot/add (repo: {repo_full_name_to_add}): {status_code} {error_detail}")
        if ge.status == 404:
             error_detail = f"Repository '{repo_full_name_to_add}' not found or access denied."
        elif ge.status == 403:
             error_detail = f"Permission denied for an operation on '{repo_full_name_to_add}'. Ensure you have admin rights."
        raise HTTPException(status_code=status_code, detail=error_detail)
        
    except Exception as e:
        print(f"Unexpected error for user {user_login} in /bot/add (repo: {repo_full_name_to_add}): {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred: {str(e)}")


@router.put("/internal/projects/{owner}/{repo_name}/increment_metrics", response_model=ProjectModel, include_in_schema=False)
async def internal_increment_project_metrics_route(
    owner: str, repo_name: str, increments: ProjectMetricsIncrementModel,
    trusted_source_token: Optional[str] = Header(None) 
):
    if not trusted_source_token or trusted_source_token != INTERNAL_SERVICE_TOKEN_ENV:
        print(f"Forbidden attempt to access internal metrics increment for {owner}/{repo_name}. Provided token: '{str(trusted_source_token)[:10]}...'")
        raise HTTPException(status_code=403, detail="Forbidden: Invalid or missing internal service token.")
    
    if not redis_client_projects:
        print(f"ERROR internal_increment_project_metrics: Redis client not available for {owner}/{repo_name}.")
        raise HTTPException(status_code=503, detail="Project data service temporarily unavailable (Redis).")
        
    project_full_name = f"{owner}/{repo_name}"
    project_data = get_project_data_from_redis(project_full_name)
    
    if not project_data:
        print(f"WARNING internal_increment_project_metrics: Project {project_full_name} not found in Redis for metrics increment.")
        raise HTTPException(status_code=404, detail=f"Project {project_full_name} not found in Redis for metrics increment.")
    
    project_data.metrics.files_analyzed = (project_data.metrics.files_analyzed or 0) + increments.files_analyzed_increment
    project_data.metrics.pull_requests_analyzed = (project_data.metrics.pull_requests_analyzed or 0) + increments.pull_requests_analyzed_increment
    
    if store_project_data_in_redis(project_data):
        print(f"Successfully incremented metrics for {project_full_name}: files_delta={increments.files_analyzed_increment}, pr_delta={increments.pull_requests_analyzed_increment}")
        return project_data
    else:
        print(f"ERROR internal_increment_project_metrics: Failed to update project metrics in Redis for {project_full_name}.")
        raise HTTPException(status_code=500, detail="Failed to update project metrics in Redis.")