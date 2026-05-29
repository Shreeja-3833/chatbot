from fastapi import APIRouter, Depends, HTTPException
from models.models import ConversationCreate
from services.session_layer import get_current_user
from services import conversation as repo

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("")
async def create(body: ConversationCreate, user_id: str = Depends(get_current_user)):
    title = body.title.strip() if body.title else repo.DEFAULT_TITLE
    return repo.create_conversation(user_id, title or repo.DEFAULT_TITLE)


@router.get("")
async def list_all(user_id: str = Depends(get_current_user)):
    return repo.list_conversations(user_id)


@router.get("/{conversation_id}/messages")
async def messages(conversation_id: str, user_id: str = Depends(get_current_user)):
    if not repo.get_conversation(conversation_id, user_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return repo.list_messages(conversation_id)

