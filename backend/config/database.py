
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
dbURL=os.getenv("dbURL")

client=MongoClient(dbURL)

db=client.user_db
collection_name=db["user_db"]
session_collection_name=db["session_db"]
conversation_collection=db["conversations"]
message_collection=db["messages"]
metrics_collection=db["metrics"]