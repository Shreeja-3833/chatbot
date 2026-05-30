# Chatbot

A Gemini-powered chatbot with conversation history, live token-by-token streaming, multiple selectable models, and a small metrics dashboard.

* **Backend:** FastAPI (Python)
* **Frontend:** React + Vite + Tailwind CSS
* **Database:** MongoDB Atlas (cloud-hosted)
* **LLM:** Google Gemini

**Demo Loom Link:** https://www.loom.com/share/fbbdec70e9004000b1e26ea836303f63

## Features

* **Multi-model support** — pick any allowed free Gemini model from a dropdown in the chat UI.
* **Streaming responses** — bot replies stream in token-by-token over Server-Sent Events (SSE).
* **Metrics dashboard** — latency, throughput, and error rate (overall + per-model) at `/dashboard`.
* **Event-based architecture** — an in-process event bus emits `llm_completed` / `llm_failed` events; a metrics subscriber records them, decoupled from the request path.
* **Failure handling** — failed LLM calls are recorded as error metrics; the UI alerts the user.

---

## Setup Instructions

### Option A — Docker (Recommended)

**Prerequisite:** Create `backend/.env` (copy from `backend/.env.example`) and fill it in:

```env
API_KEY=<your Gemini API key>
dbURL=<your MongoDB Atlas connection string>
GEMINI_MODEL=gemini-2.5-flash
```

Then from the project root:

```bash
docker compose up --build
```

Available services:

* Frontend: http://localhost:5173
* Backend: http://localhost:8000

MongoDB remains hosted on Atlas through the configured `dbURL`; only the frontend and backend run locally in Docker containers.

### Option B — Local Development

Run the backend and frontend in separate terminals.

#### Backend

```bash
cd backend

# First time only
cp .env.example .env

# Fill API_KEY and dbURL inside .env

python3 -m venv venv
source venv/bin/activate
pip install -r requirement.txt

uvicorn main:app --reload
```

#### Frontend

```bash
cd web
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

The frontend communicates with:

```text
http://localhost:8000
```

which is configured in `web/src/utils/constants.ts`.

---

## Quick Docker Run

From the project root:

```bash
docker compose up --build
```

Ensure the backend `.env` file exists and is configured according to `.env.example`.

---

## Architecture Overview

The application consists of three major components communicating over HTTP:

```text
  Browser (React + Vite + Tailwind)
        │   HTTP / SSE
        ▼
  FastAPI backend  ──────►  Google Gemini API
        │
        ├──► MongoDB Atlas
        │      (users, sessions, conversations, messages)
        │
        └──► Event Bus ──► Metrics Recorder
                           │
                           ▼
                    MongoDB metrics collection
                           │
                           ▼
                      /dashboard
```

### Technology Choices

#### FastAPI

FastAPI provides:

* Minimal boilerplate
* Built-in request validation through Pydantic
* Excellent support for streaming responses
* Easy integration with Gemini and MongoDB

#### MongoDB Atlas

MongoDB Atlas was chosen because:

* No local database installation is required
* Chat and message data naturally fit a document model
* Metadata evolves over time without migrations
* Conversations and messages are commonly read as complete documents

#### React + Vite + Tailwind

* React handles UI composition and state management
* Vite provides a fast development experience
* Tailwind allows rapid styling with utility classes

### Chat Request Flow

1. User sends a message from the browser.
2. Backend validates and processes the request.
3. Gemini generates a response.
4. Response streams back token-by-token via SSE.
5. User and bot messages are persisted to MongoDB.
6. An event is emitted for metrics recording.
7. Metrics are stored independently from chat data.

---

## Schema Design

The application uses several MongoDB collections.

### `user_db`

Stores users:

```json
{
  "username": "...",
  "password": "sha256_hash"
}
```

### `session_db`

Stores authenticated sessions:

```json
{
  "session_id": "...",
  "user_id": "...",
  "expiry": "..."
}
```

A session cookie stores the session identifier.

### `conversations`

One document per chat thread:

```json
{
  "user_id": "...",
  "title": "...",
  "created_at": "...",
  "updated_at": "...",
  "message_count": 0,
  "total_tokens": 0,
  "model_name": "..."
}
```

Running totals are stored directly on the conversation document to make sidebar queries efficient.

### `messages`

One document per message:

```json
{
  "conversation_id": "...",
  "user_id": "...",
  "role": "user | bot",
  "text": "...",
  "created_at": "...",
  "metadata": {}
}
```

Metadata may contain:

* Model name
* Token usage
* Latency
* Future extensions

### `metrics`

One document per LLM invocation:

```json
{
  "created_at": "...",
  "conversation_id": "...",
  "user_id": "...",
  "model_name": "...",
  "status": "...",
  "error_type": "...",
  "latency_ms": 0,
  "pipeline_ms": 0,
  "total_tokens": 0
}
```

Metrics are stored separately from chat content so observability workloads do not impact chat performance.

### Key Design Decisions

* Store message metadata inline.
* Denormalize conversation totals.
* Separate metrics from chat data.
* Use flexible document schemas to support evolving metadata.

---

## Architecture Notes

### Ingestion Flow

When a user sends a message:

1. Frontend sends the message, selected model, and conversation id to the streaming endpoint.
2. Backend executes a processing pipeline:

   * Input validation
   * Input cleanup
   * Gemini invocation
   * Output cleanup
3. Tokens stream back through SSE.
4. User and bot messages are persisted.
5. Conversation totals are updated.
6. An event is emitted:

   * `llm_completed`
   * `llm_failed`
7. Metrics subscriber records the outcome.

This keeps metrics collection fully decoupled from request handling.

### Logging Strategy

* Errors are logged using Python's `logging` module.
* Every LLM request generates a metrics document.
* Both successes and failures are recorded.
* Subscriber failures are isolated and cannot crash requests.

### Scaling Considerations

Current architecture is optimized for a single backend instance.

Challenges when scaling:

* In-memory event bus is not shared across instances.
* In-memory chat state would need to become fully stateless.

Potential future improvements:

* Shared event broker (Redis/Kafka)
* Fully stateless request handling
* Distributed metrics collection

MongoDB Atlas scales independently of the application.

### Failure Handling

Current behavior intentionally favors simplicity.

If Gemini fails:

1. Backend catches the exception.
2. Error metric is recorded.
3. Error is returned to the frontend.
4. Frontend notifies the user and clears loading state.

The system currently does not retry failed requests.

Event subscribers are isolated so one subscriber failure cannot impact request processing.

---

## Tradeoffs

### In-process Event Bus

**Pros**

* Simple
* Lightweight
* No additional infrastructure

**Cons**

* Events are not durable
* Does not work across multiple backend instances

### MongoDB-backed Metrics

**Pros**

* No Prometheus/Grafana setup
* Simple deployment

**Cons**

* Aggregations occur at read time
* Not ideal for very large volumes

### Session-based Authentication

**Pros**

* Easy revocation
* Simple implementation

**Cons**

* Database lookup required on protected requests

### Backward Compatibility

Both streaming and legacy non-streaming endpoints are maintained.

### SHA-256 Password Hashing

**Pros**

* Easy to implement

**Cons**

* Not ideal for production authentication systems

---

## Future Improvements

### Security

* Replace SHA-256 with bcrypt or Argon2
* Move secrets entirely into environment variables
* Add rate limiting

### Reliability

* Retry Gemini calls with exponential backoff
* Add request timeouts

### Configuration

* Move frontend API URL to environment variables

### Observability

* Prometheus integration
* Grafana dashboards
* Structured logging
* Distributed tracing

### Testing

* Unit tests
* Integration tests
* Automated CI/CD pipelines

### Scalability

* Redis or Kafka event bus
* Durable event processing
* Multi-instance backend support
