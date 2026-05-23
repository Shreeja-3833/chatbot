from fastapi import FastAPI
from models.models import Question
from services.llm import getQuestion

app = FastAPI()

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


