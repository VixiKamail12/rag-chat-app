# RAG Chat App 🦊

RAG-based chat application with SQLite + Elysia.js backend

## Stack
- **Frontend**: NEXT.js 16 + shadcn + Tailwind + TypeScript + Jotai
- **Backend**: Elysia.js (Node.js)
- **RAG**: better-sqlite3 (SQLite vector search)
- **LLM**: OpenRouter (FREE models included!)
- **Embeddings**: Xenova/gte-small (lightweight, fast)

## Architecture
```
┌─────────────────┐
│   Frontend     │  NEXT.js 16 + shadcn + Jotai
└──────┬────────┘
       │ REST API (SSE streaming)
┌──────▼──────────┐
│   Backend      │  Elysia.js
└──────┬──────────┘
       │
┌──────▼───────────────────────┐
│   RAG Layer                   │
│   - better-sqlite3 (vectors) │
│   - gte-small (embeddings)    │
│   - OpenRouter (free LLMs!)   │
└──────┬───────────────────────┘
       │
┌──────▼──────────┐
│   SQLite DB     │  documents + embeddings
└───────────────────┘
```

## Getting Started

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### `POST /api/chat`
Chat with RAG context (streaming response)
```json
{
  "message": "What services do you offer?",
  "conversationHistory": []
}
```

**Response**: Server-Sent Events (SSE) with streaming chunks

### `POST /api/documents`
Upload company documents
```json
{
  "documents": [
    { "text": "Company overview..." },
    { "text": "Services description..." }
  ]
}
```

### `GET /api/models`
Get list of available FREE models from OpenRouter
```json
{
  "models": [
    "meta-llama/Meta-Llama-3.1-8B-Instruct",
    "google/gemma-2-9b-it",
    "microsoft/WizardLM-2-8x22b",
    "huggingfaceh4/zephyr-7b-beta",
    "mistralai/Mistral-7b-instruct-v0.3"
  ]
}
```

### `GET /health`
Health check

## Free Models Available

All these models are **100% FREE** via OpenRouter:

1. **Meta Llama 3.1-8B** - Great all-around model
2. **Google Gemma 2.9b** - Fast, efficient
3. **Microsoft WizardLM 2.8x22b** - Strong reasoning
4. **Zephyr 7b** - HuggingFace's best small model
5. **Mistral 7b** - Quality chat model

**Rate Limits**:
- Without credits: 50 requests/day
- With >=10 credits: 1000 requests/day

## Environment Variables

Backend `.env`:
```
PORT=3001
DATABASE_PATH=./data/rag.db
OPENROUTER_API_KEY=your_key_here
PREFERRED_FREE_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct
RATE_LIMIT_PER_MINUTE=10
```

## RAG Workflow

1. **Ingestion**: Upload documents → Chunk → Embed → Store in SQLite
2. **Query**: User message → Embed → Vector search
3. **Generation**: Retrieved context + Query → OpenRouter FREE LLM → Answer

## Features

✅ **Streaming Responses** - Real-time AI typing effect
✅ **Free LLMs** - 5 free models via OpenRouter
✅ **Rate Limiting** - Configurable per IP/user
✅ **Error Handling** - Comprehensive throughout
✅ **Document Upload** - Batch upload with progress
✅ **Conversation History** - Persistent sessions
✅ **Responsive UI** - Mobile-friendly with shadcn
✅ **Production Ready** - Vercel config included

## Deployment

### Vercel (Frontend)
1. Fork the repo
2. Connect to Vercel
3. Import `frontend/` directory
4. Add environment variable: `NEXT_PUBLIC_API_URL`

### Backend Options

**Railway** (Recommended for SQLite)
```bash
railway up
```

**Render**
- Deploy as web service
- Add persistent disk for SQLite

**Fly.io**
- Fly launch
- Configure volume mount for `./data/rag.db`

## License

MIT

## Credits

- **Backend**: Elysia.js (21x faster than Express!)
- **LLM**: OpenRouter (unified access to 400+ models)
- **Embeddings**: Xenova/gte-small (384-dim vectors)
- **Vector DB**: better-sqlite3 (SQLite extensions)

🦊 Created by Vixi - AI-powered chat solution
