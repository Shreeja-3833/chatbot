from datetime import datetime
from bson import ObjectId
from config.database import conversation_collection, message_collection

DEFAULT_TITLE = "New chat"


def _serialize_conversation(doc: dict) -> dict:
    return {
        "conversation_id": str(doc["_id"]),
        "title": doc.get("title", DEFAULT_TITLE),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
        "message_count": doc.get("message_count", 0),
        "total_tokens": doc.get("total_tokens"),
        "model_name": doc.get("model_name"),
    }


def _serialize_message(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "conversation_id": doc["conversation_id"],
        "role": doc["role"],
        "text": doc["text"],
        "created_at": doc.get("created_at"),
        "metadata": doc.get("metadata"),
    }


def create_conversation(user_id: str, title: str = DEFAULT_TITLE) -> dict:
    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "message_count": 0,
        "total_tokens": {"prompt": 0, "candidates": 0, "thoughts": 0, "total": 0},
        "model_name": None,
    }
    result = conversation_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_conversation(doc)


def list_conversations(user_id: str) -> list:
    cursor = conversation_collection.find({"user_id": user_id}).sort("updated_at", -1)
    return [_serialize_conversation(doc) for doc in cursor]


def get_conversation(conversation_id: str, user_id: str):
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        return None
    doc = conversation_collection.find_one({"_id": oid, "user_id": user_id})
    return _serialize_conversation(doc) if doc else None


def list_messages(conversation_id: str) -> list:
    cursor = message_collection.find({"conversation_id": conversation_id}).sort("created_at", 1)
    return [_serialize_message(doc) for doc in cursor]


def add_message(conversation_id: str, user_id: str, role: str, text: str, metadata=None) -> None:
    message_collection.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": role,
        "text": text,
        "created_at": datetime.utcnow(),
        "metadata": metadata,
    })


def rename_conversation(conversation_id: str, user_id: str, title: str) -> bool:
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        return False
    result = conversation_collection.update_one(
        {"_id": oid, "user_id": user_id},
        {"$set": {"title": title, "updated_at": datetime.utcnow()}},
    )
    return result.matched_count > 0


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        return False
    result = conversation_collection.delete_one({"_id": oid, "user_id": user_id})
    message_collection.delete_many({"conversation_id": conversation_id})
    return result.deleted_count > 0


def update_conversation_stats(conversation_id: str, token_usage: dict, model_name: str, first_user_text: str = None) -> None:
    try:
        oid = ObjectId(conversation_id)
    except Exception:
        return

    inc = {
        "message_count": 2,
        "total_tokens.prompt": token_usage.get("prompt_token_count") or 0,
        "total_tokens.candidates": token_usage.get("candidates_token_count") or 0,
        "total_tokens.thoughts": token_usage.get("thoughts_token_count") or 0,
        "total_tokens.total": token_usage.get("total_token_count") or 0,
    }
    set_fields = {"updated_at": datetime.utcnow(), "model_name": model_name}

    if first_user_text:
        title = first_user_text.strip()[:40]
        conversation_collection.update_one(
            {"_id": oid, "title": DEFAULT_TITLE},
            {"$set": {"title": title or DEFAULT_TITLE}},
        )

    conversation_collection.update_one({"_id": oid}, {"$inc": inc, "$set": set_fields})


def load_gemini_history(conversation_id: str) -> list:
    history = []
    for msg in list_messages(conversation_id):
        role = "model" if msg["role"] == "bot" else "user"
        history.append({"role": role, "parts": [{"text": msg["text"]}]})
    return history
