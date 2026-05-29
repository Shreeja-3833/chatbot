
from pydantic import BaseModel
from typing import Optional

class Question(BaseModel):
    input: str
    conversation_id: str

class ConversationCreate(BaseModel):
    title: Optional[str] = None

class ConversationRename(BaseModel):
    title: str

class User(BaseModel):
    username: str
    password: str
class Login(BaseModel):
    username: str
    password: str
class Token(BaseModel):
    access_token: str
    token_type: str
class TokenData(BaseModel):
    username: Optional[str] = None