import os
import json
import logging
import traceback
from datetime import datetime, timedelta

import redis
from fastapi import FastAPI, HTTPException, APIRouter
from pydantic import BaseModel
from jose import JWTError, jwt

from google.oauth2 import id_token
from google.auth.transport import requests as google_auth_requests

from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
load_dotenv()

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not CLIENT_ID:
    logging.critical("CRITICAL: GOOGLE_CLIENT_ID environment variable is not set!")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB_AUTH = int(os.getenv("REDIS_DB_AUTH", 1))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "Abcd@1234")

LOGIN_DB_KEY = "login_db"

APP_SECRET_KEY = os.getenv("YOUR_APP_SECRET_KEY")
APP_TOKEN_ALGORITHM = os.getenv("YOUR_APP_TOKEN_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

if not APP_SECRET_KEY:
    logging.critical("CRITICAL: YOUR_APP_SECRET_KEY environment variable is not set! App token generation will fail.")

logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


app = FastAPI()
router = APIRouter()


origins = [
   "http://localhost:5173",
    "https://localhost:5173/login",
    "localhost:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


redis_client_auth = None # Renamed from redis_client to match previous logic context
try:
    redis_client_auth = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB_AUTH, # Used REDIS_DB_AUTH as per previous logic
        decode_responses=True,
        password=REDIS_PASSWORD
    )
    redis_client_auth.ping()
    logger.info(f"Successfully connected to Redis for Auth on DB {REDIS_DB_AUTH}!")
except redis.exceptions.RedisError as e:
    logger.error(f"CRITICAL ERROR: Could not connect to or authenticate with Redis for Auth: {e}")


class GoogleTokenPayload(BaseModel): # Renamed from Token to be more specific
    id_token: str # Changed from tkn to id_token

class LoginEvent(BaseModel): # Renamed from Login to be more specific
    timestamp: str = datetime.utcnow().isoformat()
    user_name: str = ""
    user_email: str = ""


def create_app_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if not APP_SECRET_KEY:
        logger.error("YOUR_APP_SECRET_KEY is not set. Cannot create JWT.")
        raise ValueError("Cannot create token: Application secret key is not configured.")

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, APP_SECRET_KEY, algorithm=APP_TOKEN_ALGORITHM)
    return encoded_jwt


@router.post("/auth/google/verify_id_token") # Matched to frontend call
async def verify_google_id_token(payload: GoogleTokenPayload): # Using specific model
    logger.info("Received request for /auth/google/verify_id_token")

    if not CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID is not configured on the server.")
        raise HTTPException(status_code=500, detail="Server configuration error: Missing Google Client ID.")
    if not APP_SECRET_KEY:
        logger.error("YOUR_APP_SECRET_KEY is not configured on the server. Cannot issue app tokens.")
        raise HTTPException(status_code=500, detail="Server configuration error: App token signing key missing.")

    try:
        logger.info(f"Attempting to verify Google ID token (first few chars): {payload.id_token[:20]}...")
        idinfo = id_token.verify_oauth2_token(
            payload.id_token,
            google_auth_requests.Request(),
            CLIENT_ID
        )
        logger.info("Google ID Token successfully verified.")

        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture') # Changed from pic to picture

        if not email:
            logger.error("Email not found in verified Google ID token.")
            raise HTTPException(status_code=400, detail="Email not found in token")

        logger.info(f"User details from Google token: Email='{email}', Name='{name or 'N/A'}'")

        app_token_data = {"sub": email, "name": name}
        app_access_token = create_app_access_token(data=app_token_data)
        logger.info(f"Generated application access token for {email}.")

        if redis_client_auth:
            login_event_data = LoginEvent(
                timestamp=datetime.utcnow().isoformat(),
                user_name=name or "N/A",
                user_email=email
            )
            try:
                redis_client_auth.hset(LOGIN_DB_KEY, login_event_data.timestamp + "_" + email, login_event_data.model_dump_json())
                logger.info(f"Login event recorded to Redis for {email}")
            except redis.exceptions.RedisError as e_redis_log:
                logger.error(f"Failed to record login event to Redis for {email}: {e_redis_log}")
        else:
            logger.warning("Redis client (auth) not available. Skipping login event logging for {email}.")

        return {
            "email": email,
            "name": name,
            "picture": picture,
            "access_token": app_access_token,
            "message": "ID Token verified successfully. Application token issued."
        }

    except ValueError as e:
        logger.error(f"Google ID Token validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid Google ID token: {str(e)}")
    except JWTError as e_jwt:
        logger.error(f"Error creating application JWT: {str(e_jwt)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Could not create session token: {str(e_jwt)}")
    except Exception as e:
        logger.error(f"Unexpected error during ID token verification: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing ID token: {str(e)}")

app.include_router(router)
