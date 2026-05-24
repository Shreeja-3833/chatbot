import os
from fastapi import FastAPI
from models.models import Question
from services.llm import getQuestion
from fastapi.middleware.cors import CORSMiddleware
from router.routes import router

app = FastAPI()

origins=["http://localhost:5173"]
app.add_middleware(CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)

app.include_router(router)

# load_dotenv()
# dbURL=os.getenv("dbURL")
# client = MongoClient(dbURL, server_api=ServerApi('1'))

# try:
#     client.admin.command('ping')
#     print("Pinged your deployment. You successfully connected to MongoDB!")
# except Exception as e:
#     print(e)


@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/get_input")
async def get_input(question: Question):
    input=question.input
    response=getQuestion(input)
    return{
        "response":response
    }
