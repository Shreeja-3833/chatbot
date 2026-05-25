from fastapi import APIRouter
from config.database import collection_name
from bson import ObjectId
from services.serializer import list_users
from models.models import User
import hashlib
from fastapi.responses import RedirectResponse


router=APIRouter()

@router.get("/users")
async def get_users():
    users=list_users(collection_name.find())
    return users

@router.post("/create_user")
async def create_user(user:User):
    hashed_pass = hashlib.sha256(user.password.encode()).hexdigest()
    user_obj=dict(user)
    user_obj["password"]=hashed_pass
    collection_name.insert_one(user_obj)
    return {"status_code": 200, "message": "User created successfully"}
