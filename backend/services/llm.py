import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key=os.getenv("API_KEY")

client = genai.Client( api_key=api_key)

chat = client.chats.create(model="gemini-2.5-flash")

def getQuestion(input: str):
    start_time=time.time()
    response = chat.send_message(input)
    ans=""
    duration=time.time()-start_time
    metadata={
        "model_name":response.model_version,
        "latency_seconds": round(duration, 4),
        "token_usage":{
            "prompt_token_count":response.usage_metadata.prompt_token_count,
            "candidates_token_count":response.usage_metadata.candidates_token_count,
            "thoughts_token_count":response.usage_metadata.thoughts_token_count,
            "total_token_count":response.usage_metadata.total_token_count
        },
        "input":input,
        "output":response.candidates[0].content.parts
        # "session_id" //need to initiate chat according to user id session id maybe maintain conversation id
    }
    # print(metadata)
    for part in response.candidates[0].content.parts:
        if part.text:
            ans+=part.text+" "
    return {"ans":ans, "metadata":metadata}