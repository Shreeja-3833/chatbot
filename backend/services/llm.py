from __future__ import annotations

import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

import os
import time
import logging
from google import genai
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()
api_key=os.getenv("API_KEY")
logger = logging.getLogger(__name__)

ALLOWED_MODELS = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]

@dataclass
class GeminiConfig:
    api_key: str
    model: str = "gemini-2.5-flash"

class GeminiClient:
    def __init__(self, config:GeminiConfig, history_loader=None):
        self.config=config
        self._client = genai.Client(api_key=config.api_key)
        self._chat_sessions: dict[str, dict] = {}
        self._history_loader=history_loader

    def resolve_model(self, model: str | None) -> str:
        if model and model in ALLOWED_MODELS:
            return model
        return self.config.model

    def get_or_create_session(self, session_id:str, model: str | None = None):
        resolved = self.resolve_model(model)
        existing = self._chat_sessions.get(session_id)
        if not existing or existing["model"] != resolved:
            history=self._history_loader(session_id) if self._history_loader else []
            chat=self._client.chats.create(model=resolved, history=history)
            self._chat_sessions[session_id]={"chat": chat, "model": resolved}

        return self._chat_sessions[session_id]["chat"]
    
    def clear_session(self,session_id:str):
        if session_id in self._chat_sessions:
            del self._chat_sessions[session_id]
            return True
        
        return False
    
    def active_sessions(self):
        return list(self._chat_sessions.keys())
    
    def extract_metadata(self,response:any):
        usage = getattr(response, "usage_metadata", None)
        token_usage = {
            "prompt_token_count": getattr(usage, "prompt_token_count", None),
            "candidates_token_count": getattr(usage, "candidates_token_count", None),
            "thoughts_token_count": getattr(usage, "thoughts_token_count", None),
            "total_token_count": getattr(usage, "total_token_count", None),
        } if usage else {}

        return {
            "model_name": getattr(response, "model_version", None),
            "token_usage": token_usage,
        }
         
    
    def send_msg(self,input:str, session_id:str, model: str | None = None):
        chat=self.get_or_create_session(session_id, model)
        # print('hello chat present')
        start=time.perf_counter()
        try:
            response= chat.send_message(input)
        except Exception as exc:
            print("Gemini API error for session %s: %s", session_id, exc)
            logger.error("Gemini API error for session %s: %s", session_id, exc)
            raise

        end=time.perf_counter()-start
        ans=response.text or ""

        metadata=self.extract_metadata(response)
        metadata["session_id"]=session_id
        metadata["input"]=input
        metadata["latency_ms"]=round(end*1000, 2)


        return {"response":ans, "metadata":metadata}

    def send_msg_stream(self, input: str, session_id: str, model: str | None = None):
        chat = self.get_or_create_session(session_id, model)
        start = time.perf_counter()
        full = ""
        last_chunk = None

        try:
            for chunk in chat.send_message_stream(input):
                last_chunk = chunk
                delta = chunk.text or ""
                if delta:
                    full += delta
                    yield ("delta", delta)
        except Exception as exc:
            print("Gemini API stream error for session %s: %s", session_id, exc)
            logger.error("Gemini API stream error for session %s: %s", session_id, exc)
            raise

        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        if last_chunk is not None:
            metadata = self.extract_metadata(last_chunk)
        else:
            metadata = {"model_name": self.resolve_model(model), "token_usage": {}, "output": []}
        metadata["session_id"] = session_id
        metadata["input"] = input
        metadata["latency_ms"] = latency_ms

        yield ("final", {"response": full, "metadata": metadata})
