
from pydantic import BaseModel
from typing import Optional

class Question(BaseModel):
    input: str

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