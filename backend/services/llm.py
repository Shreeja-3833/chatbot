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

@dataclass
class GeminiConfig:
    api_key: str
    model: str = "gemini-2.5-flash"

class GeminiClient:
    def __init__(self, config:GeminiConfig):
        self.config=config
        self._client = genai.Client(api_key=config.api_key)
        self._chat_sessions: dict[str, object] = {}

    def get_or_create_session(self, session_id:str):
        if session_id not in self._chat_sessions:
            self._chat_sessions[session_id]=self._client.chats.create(model=self.config.model)
            # logger.info("Created new chat session: %s", session_id)

        return self._chat_sessions[session_id]
    
    def clear_session(self,session_id:str):
        if session_id in self._chat_sessions:
            del self._chat_sessions[session_id]
            return True
        
        return False
    
    def active_sessions(self):
        return list(self._chat_sessions.keys())
    
    def extract_metadata(self,response:any):
        metadata={
        "model_name":response.model_version,
        "token_usage":{
            "prompt_token_count":response.usage_metadata.prompt_token_count,
            "candidates_token_count":response.usage_metadata.candidates_token_count,
            "thoughts_token_count":response.usage_metadata.thoughts_token_count,
            "total_token_count":response.usage_metadata.total_token_count
        },
        "output":response.candidates[0].content.parts
        }   

        return metadata
         
    
    def send_msg(self,input:str, session_id:str):
        chat=self.get_or_create_session(session_id)
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


        return {"response":ans, "metadata":metadata}
