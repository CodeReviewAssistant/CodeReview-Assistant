from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import logging
import requests
import json
import redis
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
router = APIRouter()
app = FastAPI()

origins = [
    "https://localhost:5173",
    "https://localhost:5173/chat",
    "https://localhost:5173/login",
    "localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Redis Setup
redis_client = redis.Redis(host='localhost', port=6379, db=1, decode_responses=True, password="Abcd@1234")

# Database keys
FOLDER_DB = "folder_db"
CHAT_DB = "chat_db"
LOGIN_DB = "login_db"

# Models
class Folder(BaseModel):
    folder_id: str
    name: str
    count: int = 0
    chat_ids: list[str] = []
    pin_status: bool = False

class Chat(BaseModel):
    chat_id: str
    name: str
    messages: dict
    folder_id: str | None = None
    pin_status: bool = False

class Login(BaseModel):
    timestamp: str = datetime.utcnow().isoformat()
    user_name: str
    user_email: str

# Folder Routes
@router.post("/redis_db/folder/add")
def add_folder(folder: Folder):
    redis_client.hset(FOLDER_DB, folder.folder_id, json.dumps(folder.dict()))
    return {"message": "Folder added successfully"}

@router.get("/redis_db/folder/get/{folder_id}")
def getall_folder(folder_id: str):
    folder_data = redis_client.hget(FOLDER_DB, folder_id)
    if not folder_data:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return json.loads(folder_data)

@router.get("/redis_db/folder/getall")
def get_folder():
    folder_data = redis_client.hgetall(FOLDER_DB)
    if not folder_data:
        raise HTTPException(status_code=404, detail="Folder not found")
    parsed_folders = {}
    for folder_id, data in folder_data.items():
        parsed_folders[folder_id] = data
    return parsed_folders

@router.put("/redis_db/folder/update/{folder_id}")
def update_folder(folder_id: str, folder: Folder):
    if not redis_client.hexists(FOLDER_DB, folder_id):
        raise HTTPException(status_code=404, detail="Folder not found")
    redis_client.hset(FOLDER_DB, folder_id, json.dumps(folder.dict()))
    return {"message": "Folder updated successfully"}

@router.delete("/redis_db/folder/delete/{folder_id}")
def delete_folder(folder_id: str):
    redis_client.hdel(FOLDER_DB, folder_id)
    return {"message": "Folder deleted successfully"}

# Chat Routes
@router.post("/redis_db/chat/add")
def add_chat(chat: Chat):
    redis_client.hset(CHAT_DB, chat.chat_id, json.dumps(chat.dict()))
    return {"message": "Chat added successfully"}

@router.get("/redis_db/chat/getall")
def getall_chat():
    chat_data = redis_client.hgetall(CHAT_DB)
    if not chat_data:
        raise HTTPException(status_code=404, detail="Chat not found")
    parsed_chats = {}
    for chat_id, data in chat_data.items():
        parsed_chats[chat_id] = data
    return parsed_chats
    
    

@router.get("/redis_db/chat/get/{chat_id}")
def get_chat(chat_id: str):
    chat_data = redis_client.hget(CHAT_DB, chat_id)
    if not chat_data:
        raise HTTPException(status_code=404, detail="Chat not found")
    return json.loads(chat_data)

@router.put("/redis_db/chat/update/{chat_id}")
def update_chat(chat_id: str, chat: Chat):
    if not redis_client.hexists(CHAT_DB, chat_id):
        raise HTTPException(status_code=404, detail="Chat not found")
    redis_client.hset(CHAT_DB, chat_id, json.dumps(chat.dict()))
    return {"message": "Chat updated successfully"}

@router.delete("/redis_db/chat/delete/{chat_id}")
def delete_chat(chat_id: str):
    redis_client.hdel(CHAT_DB, chat_id)
    return {"message": "Chat deleted successfully"}

# Login Routes
@router.post("/redis_db/login/add")
def add_login(login: Login):
    redis_client.hset(LOGIN_DB, login.timestamp, json.dumps(login.dict()))
    return {"message": "Login recorded successfully"}

@router.get("/redis_db/login/get")
def get_logins():
    logins = redis_client.hgetall(LOGIN_DB)
    return {key: json.loads(value) for key, value in logins.items()}

@router.delete("/redis_db/login/clear")
def clear_logins():
    redis_client.delete(LOGIN_DB)
    return {"message": "All logins cleared"}

app.include_router(router)