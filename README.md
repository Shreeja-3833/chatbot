# chatbot

A Gemini-powered chatbot: FastAPI backend + React/Vite frontend, MongoDB Atlas storage.

## Features

- **Multi-model support** — pick any allowed free Gemini model from a dropdown in the chat UI.
- **Streaming responses** — bot replies stream in token-by-token over SSE.
- **Metrics dashboard** — latency, throughput, and error rate (overall + per-model) at `/dashboard`.
- **Event-based architecture** — an in-process event bus emits `llm_completed` / `llm_failed`
  events; a metrics subscriber persists them, decoupled from the request path.
- **Failure handling** — failed LLM calls are recorded as error metrics; the UI alerts the user.

## One-command setup (Docker Compose)

1. Create `backend/.env` (see `backend/.env.example`):

   ```env
   API_KEY=<your Gemini API key>
   dbURL=<your MongoDB Atlas connection string>
   GEMINI_MODEL=gemini-2.5-flash   # optional default
   ```

2. Bring everything up:

   ```bash
   docker compose up --build
   ```

   - Frontend: http://localhost:5173
   - Backend:  http://localhost:8000

MongoDB stays on cloud Atlas (configured via `dbURL`); only the backend and frontend run in containers.

## Local development (without Docker)

Backend:

```bash
cd backend
pip install -r requirement.txt
uvicorn main:app --reload
```

Frontend:

```bash
cd web
npm install
npm run dev
```
