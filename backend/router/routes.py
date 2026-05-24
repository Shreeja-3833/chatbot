from fastapi import APIRouter
from config.database import collection_name
from bson import ObjectId
from services.serializer import list_users
from models.models import User
router=APIRouter()

@router.get("/users")
async def get_users():
    users=list_users(collection_name.find())
    return users

@router.post("/create_user")
async def create_user(user:User):
    collection_name.insert_one(dict(user))
