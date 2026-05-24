import string
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)

import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key=os.getenv("API_KEY")

client = genai.Client( api_key=api_key)

chat = client.chats.create(model="gemini-2.5-flash")

def getQuestion(input: str):
    response1 = chat.send_message(input)
    ans=""
    for part in response1.candidates[0].content.parts:
        if part.text:
            ans+=part.text+" "
    return ans