# RAG Chat App 🦊

RAG-based chat application with SQLite + Elysia.js backend

## Stack
- **Frontend**: NEXT.js 16 + shadcn + Tailwind + TypeScript + Jotai
- **Backend**: Elysia.js (Node.js)
- **RAG**: better-sqlite3 (SQLite vector search)
- **Embeddings**: Xenova/gte-small (lightweight, fast)

## Architecture
```
┌─────────────────┐
│   Frontend     │  NEXT.js 16 + shadcn + Jotai
└──────┬────────┘
       │ REST API
┌──────▼──────────┐
│   Backend      │  Elysia.js
└──────┬──────────┘
       │
┌──────▼───────────────────────┐
│   RAG Layer                   │
│   - better-sqlite3 (vectors) │
│   - gte-small (embeddings)    │
│   - similarity search          │
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
Chat with RAG context
```json
{
  "message": "What services do you offer?"
}
```

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

### `GET /health`
Health check

## Environment Variables

Backend `.env`:
```
PORT=3001
DATABASE_PATH=./data/rag.db
```

## RAG Workflow

1. **Ingestion**: Upload documents → Chunk → Embed → Store in SQLite
2. **Query**: User message → Embed → Vector search
3. **Generation**: Retrieved context + Query → LLM → Answer

## Next Steps

- [ ] Add actual LLM integration (OpenAI/Anthropic)
- [ ] Add frontend chat UI with streaming
- [ ] Implement document chunking strategy
- [ ] Add web UI for document upload
- [ ] Add conversation history
- [ ] Deploy to Vercel

## License

MIT
