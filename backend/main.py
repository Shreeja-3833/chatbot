import hashlib
import json
import os
from fastapi import FastAPI,Depends, Request, Response, HTTPException
from fastapi.responses import RedirectResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from models.models import Question, User
from services.llm import GeminiClient, GeminiConfig, ALLOWED_MODELS
from services.session_layer import validate_session, get_current_user, create_random_session_string, three_day_expiry
from services.pipeline import IngestionPipeline, PipelineInput
from services import conversation as convo_repo
from services import metrics as metrics_service
from services.events import bus, LLM_COMPLETED, LLM_FAILED
from router.routes import router
from router.conversations import router as conversations_router
from router.metrics import router as metrics_router
from config.database import collection_name,session_collection_name
from contextlib import asynccontextmanager
from dotenv import load_dotenv

model=GeminiClient
pipeline=IngestionPipeline
load_dotenv()

@asynccontextmanager
async def lifespan(app:FastAPI):
    global model, pipeline
    api_key=os.getenv("API_KEY")

    config = GeminiConfig(
        api_key=api_key,
        model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
    )
    model=GeminiClient(config, history_loader=convo_repo.load_gemini_history)
    pipeline=IngestionPipeline(client=model)

    bus.subscribe(LLM_COMPLETED, metrics_service.record_event)
    bus.subscribe(LLM_FAILED, metrics_service.record_event)

    print("Model and pipeline ready")

    yield

    print("Shutting down", model.active_sessions())



app = FastAPI(title="Chatbot", lifespan=lifespan)

origins=["http://localhost:5173"]
app.add_middleware(CORSMiddleware,           
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

app.add_middleware(
    SessionMiddleware,     
    secret_key='sk_vR8n2KmPqL4xWj9TcFaG3dH5pN7mQrS'
)

app.include_router(router)
app.include_router(conversations_router)
app.include_router(metrics_router)


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

@app.get("/models")
def list_models():
    return {"models": ALLOWED_MODELS}

@app.post("/get_input")
async def get_input(question: Question, request: Request, user_id: str = Depends(get_current_user)):
    session_id=request.cookies.get("Authorization")
    conversation_id=question.conversation_id
    input=question.input

    conversation=convo_repo.get_conversation(conversation_id, user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_first=conversation["message_count"] == 0

    pipeline_input=PipelineInput(text=input, session_id=session_id, conversation_id=conversation_id, user_id=user_id, model=question.model)

    try:
        response=pipeline.run(pipeline_input)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        print("Pipeline error for conversation %s", conversation_id)
        bus.emit(LLM_FAILED, {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "model_name": question.model,
            "status": "error",
            "error_type": type(exc).__name__,
        })
        raise HTTPException(status_code=500, detail="Internal pipeline error.") from exc

    meta=response.metadata
    token_usage=meta.get("token_usage", {})
    stored_metadata={
        "model_name":meta.get("model_name"),
        "token_usage":token_usage,
        "latency_ms":meta.get("latency_ms"),
        "pipeline_ms":meta.get("pipeline_ms"),
    }

    convo_repo.add_message(conversation_id, user_id, "user", input)
    convo_repo.add_message(conversation_id, user_id, "bot", response.answer, metadata=stored_metadata)
    convo_repo.update_conversation_stats(
        conversation_id,
        token_usage,
        meta.get("model_name"),
        first_user_text=input if is_first else None,
    )

    bus.emit(LLM_COMPLETED, {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "model_name": meta.get("model_name"),
        "status": "success",
        "token_usage": token_usage,
        "latency_ms": meta.get("latency_ms"),
        "pipeline_ms": meta.get("pipeline_ms"),
    })

    return{
        "response":response.answer,
        "conversation_id":conversation_id,
        "metadata":stored_metadata,
    }

@app.post("/get_input_stream")
async def get_input_stream(question: Question, request: Request, user_id: str = Depends(get_current_user)):
    session_id=request.cookies.get("Authorization")
    conversation_id=question.conversation_id
    input=question.input

    conversation=convo_repo.get_conversation(conversation_id, user_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_first=conversation["message_count"] == 0
    pipeline_input=PipelineInput(text=input, session_id=session_id, conversation_id=conversation_id, user_id=user_id, model=question.model)

    def event_stream():
        try:
            output=None
            for kind, value in pipeline.run_stream(pipeline_input):
                if kind == "delta":
                    yield f"data: {json.dumps({'delta': value})}\n\n"
                else:
                    output=value
        except Exception as exc:
            print("Stream pipeline error for conversation %s", conversation_id)
            bus.emit(LLM_FAILED, {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "model_name": question.model,
                "status": "error",
                "error_type": type(exc).__name__,
            })
            yield f"event: error\ndata: {json.dumps({'detail': 'Internal pipeline error.'})}\n\n"
            return

        meta=output.metadata
        token_usage=meta.get("token_usage", {})
        stored_metadata={
            "model_name":meta.get("model_name"),
            "token_usage":token_usage,
            "latency_ms":meta.get("latency_ms"),
            "pipeline_ms":meta.get("pipeline_ms"),
        }

        convo_repo.add_message(conversation_id, user_id, "user", input)
        convo_repo.add_message(conversation_id, user_id, "bot", output.answer, metadata=stored_metadata)
        convo_repo.update_conversation_stats(
            conversation_id,
            token_usage,
            meta.get("model_name"),
            first_user_text=input if is_first else None,
        )

        bus.emit(LLM_COMPLETED, {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "model_name": meta.get("model_name"),
            "status": "success",
            "token_usage": token_usage,
            "latency_ms": meta.get("latency_ms"),
            "pipeline_ms": meta.get("pipeline_ms"),
        })

        yield f"event: done\ndata: {json.dumps({'conversation_id': conversation_id})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

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
    session_collection_name.insert_one({
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
    return {"message":"Login successful", "status_code": 200}

 