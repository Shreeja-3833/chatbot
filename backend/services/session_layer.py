import secrets
from fastapi import Request
import logging
from datetime import datetime,timedelta, timezone
from config.database import session_collection_name

def three_day_expiry():
    return datetime.utcnow() + timedelta(days=3)

def create_random_session_string() -> str:
    return secrets.token_urlsafe(32)

def is_token_expired(unix_timestamp: int) -> bool:
    if unix_timestamp:
        datetime_from_unix = datetime.fromtimestamp(unix_timestamp)
        current_time = datetime.now()
        difference_in_minutes = (datetime_from_unix - current_time).total_seconds() / 60
        return difference_in_minutes <= 0
    
    return True


def validate_session(request: Request) -> bool:
    session_authorization = request.cookies.get("Authorization")

    if not session_authorization:
        logging.info("No Authorization in session, redirecting to login")
        return False
    session=session_collection_name.find_one({"session_id":session_authorization})
    
    if not session:
        return False
    if datetime.utcnow() > session["expiry"]:
        session_collection_name.delete_one({"session_id": session_authorization})  
        return False
    
    logging.info("Valid Session, Access granted.")
    return True