import hashlib
import hmac
import os

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv


from app.helpers.github_helper import GitHubHelper 

load_dotenv(override=True)






GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
BOT_GITHUB_PERMANENT_TOKEN = os.getenv("BOT_GITHUB_PERMANENT_TOKEN")


router = APIRouter(
    tags=["Webhook APIs"],
    responses={404: {"description": "Not found"}},
)

async def verify_github_signature(request: Request):
    if not GITHUB_WEBHOOK_SECRET:
        print("CRITICAL: GITHUB_WEBHOOK_SECRET is not configured. Webhook verification will fail.")
        raise HTTPException(status_code=500, detail="Webhook secret not configured on server.")

    signature_header = request.headers.get("X-Hub-Signature-256")
    if not signature_header:
        raise HTTPException(status_code=401, detail="X-Hub-Signature-256 header is missing.")

    try:
        hash_algorithm, signature = signature_header.split("=", 1)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid X-Hub-Signature-256 format.")

    if hash_algorithm != "sha256":
        raise HTTPException(status_code=401, detail="Unsupported signature algorithm. Use SHA256.")

    payload_body = await request.body()
    
    calculated_hmac = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        payload_body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(calculated_hmac, signature):
        raise HTTPException(status_code=401, detail="Invalid GitHub webhook signature.")
    
    return True


@router.post("/webhook")
async def handle_github_webhook_event(request: Request, verified: bool = Depends(verify_github_signature)):
    if not BOT_GITHUB_PERMANENT_TOKEN:
        print("Error: BOT_GITHUB_PERMANENT_TOKEN is not set. Cannot initialize GitHubHelper for webhook.")
        return JSONResponse(status_code=500, content={"message": "Webhook processing failed due to missing bot configuration."})

    
    
    github_helper = GitHubHelper(user_github_token=BOT_GITHUB_PERMANENT_TOKEN)
    
    try:
        
        status_code, message = await github_helper.handle_github_webhook(request=request)
        return JSONResponse(status_code=status_code, content={"message": message})
    except Exception as e:
        print(f"Error handling GitHub webhook: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"message": "Internal server error handling webhook"})

