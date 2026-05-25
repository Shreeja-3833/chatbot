import hashlib
from fastapi import FastAPI,Depends, Request, Response, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from models.models import Question, User
from services.llm import getQuestion
from services.session_layer import validate_session, create_random_session_string, three_day_expiry
from router.routes import router
from config.database import collection_name,session_collection_name

app = FastAPI()

origins=["http://localhost:5173"]
app.add_middleware(CORSMiddleware,           
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )
app.add_middleware(SessionMiddleware,     secret_key='sk_vR8n2KmPqL4xWj9TcFaG3dH5pN7mQrS'
)

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
async def get_input(question: Question,request: Request):
    session_id=request.cookies.get("Authorization")
    input=question.input
    response=getQuestion(input)
    return{
        "response":response
    }

@app.get("/session_valid")
async def session_valid(request: Request, is_valid_session: bool = Depends(validate_session)):
    if not is_valid_session:
        return {"status_code": 404, "message": "Kindly login again"}
    return {"message": "Session valid", "status_code": 200}

@app.get("/logout")
async def logout(request: Request, response: Response):
    session_id=request.cookies.get("Authorization")

    if session_id:
        session_collection_name.delete_one({"session_id":session_id})
    
    request.session.clear()
    response.delete_cookie(key="Authorization")
    return {"message":"Logged out", "status_code": 200}

@app.post("/login")
async def login(request: Request, user: User, response: Response):
    db_user = collection_name.find_one({"username": user.username})
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    hashed = hashlib.sha256(user.password.encode()).hexdigest()
    if hashed != db_user["password"]:
        raise HTTPException(status_code=401, detail="Wrong password")

    session_id = create_random_session_string()
    expiry=three_day_expiry()
    session_collection_name.insert({
        "session_id":session_id,
        "user_id":str(db_user["_id"]),
        "expiry":expiry
    })

    request.session["session_id"] = session_id
    request.session["token_expiry"] = expiry.isoformat()

    
    
    response.set_cookie(
    key="Authorization",
    value=session_id,
    httponly=True,
    samesite="lax",
    domain="localhost"  
)
    return {"message":"Login", "status_code": 200}

