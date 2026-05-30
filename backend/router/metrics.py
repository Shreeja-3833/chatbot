from fastapi import APIRouter, Depends
from services.session_layer import get_current_user
from services import metrics as metrics_service

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/summary")
async def summary(window: int = 60, user_id: str = Depends(get_current_user)):
    return metrics_service.get_summary(window_minutes=window)
