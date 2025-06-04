from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
from google.oauth2 import id_token
from starlette.responses import JSONResponse
import uvicorn
from app.api import redis_db
from app.api import webhook
from app.api import git
from app.api import users
from app.api import model
from app.api import auth
from app.helpers import verify_token
from google.auth.transport import requests as google_requests
from fastapi.middleware.cors import CORSMiddleware
import logging
import requests

app = FastAPI(
   title="Code Review API",
   description="API for generating code reviews",
   version="0.1"  
)


origins = [
    "http://localhost:5173",
    "http://localhost:5173/integrations",
    "http://localhost:5173/chat",
    "https://localhost:5173/login",
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(model.router)
app.include_router(verify_token.router)
app.include_router(redis_db.router)
app.include_router(webhook.router)
app.include_router(git.router)
app.include_router(users.router)
app.include_router(auth.router)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"message": "Validation Error", "errors": exc.errors()},
    )
@app.get("/test-main-webhook-path")
async def test_main_webhook_path_get():
    print("--- GET request to /test-main-webhook-path received ---")
    return {"message": "GET request to /test-main-webhook-path is working!"}

@app.post("/test-main-webhook-path")
async def test_main_webhook_path_post():
    print("--- POST request to /test-main-webhook-path received ---")
    return {"message": "POST request to /test-main-webhook-path is working!"}
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)