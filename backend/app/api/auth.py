from urllib.parse import urlencode
from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse, RedirectResponse
import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter(
    tags=["Auth APIs"],
    responses={404: {"description": "Not found"}},
)

@router.get("/github")
def github_auth_redirect():
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")
    GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize"
    GITHUB_SCOPES = "repo user" 

    if not GITHUB_CLIENT_ID or not GITHUB_REDIRECT_URI:
        return JSONResponse(
            status_code=500,
            content={"message": "GitHub OAuth configuration (Client ID or Redirect URI) is missing on server"}
        )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": GITHUB_SCOPES,
    }
    auth_url = f"{GITHUB_OAUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)

@router.get("/github/callback")
async def github_callback(code: str):
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
    
    GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
    FRONTEND_INTEGRATIONS_URL = os.getenv("FRONTEND_INTEGRATIONS_URL", "http://localhost:5173/integrations")


    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        return JSONResponse(
            status_code=500,
            content={"message": "GitHub OAuth configuration (Client ID or Client Secret) is missing on server"}
        )

    token_data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        
    }
    headers = {"Accept": "application/json"} 

    try:
        token_exchange_response = requests.post(GITHUB_TOKEN_URL, data=token_data, headers=headers)
        token_exchange_response.raise_for_status()
        token_info = token_exchange_response.json()
        access_token = token_info.get("access_token")

        if not access_token:
            error_description = token_info.get("error_description", "No error description provided.")
            print(f"GitHub token exchange error: {token_info.get('error')}, Desc: {error_description}")
            return JSONResponse(
                status_code=400,
                content={"message": f"Failed to retrieve access token from GitHub. Error: {error_description}"}
            )
        
        
        response = RedirectResponse(url=FRONTEND_INTEGRATIONS_URL)
        
        response.set_cookie(
            key="access_token",
            value=access_token, 
            httponly=False,      
            samesite='Lax',     
            secure=False,       
            
            
        )
        print(f"Successfully obtained GitHub access token (first few chars): {access_token[:5]}... and set cookie.")
        return response

    except requests.exceptions.RequestException as e:
        print(f"Error during GitHub token exchange request: {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"GitHub Error Status during token exchange: {e.response.status_code}")
             try:
                 print(f"GitHub Error Response during token exchange: {e.response.json()}")
             except requests.exceptions.JSONDecodeError:
                 print(f"GitHub Error Response (non-JSON) during token exchange: {e.response.text}")
        return JSONResponse(
            status_code=500, 
            content={"message": f"An error occurred while exchanging the authorization code with GitHub: {str(e)}"}
        )




