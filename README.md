# RAG Chat App 🦊

RAG-based chat application with SQLite + Elysia.js backend

## Stack
- **Frontend**: NEXT.js 16 + shadcn + Tailwind + TypeScript + Jotai
- **Backend**: Elysia.js (Node.js)
- **RAG**: better-sqlite3 (SQLite vector search)
- **Embeddings**: Xenova/gte-small (lightweight, fast)
- **LLM**: OpenAI GPT-4o-mini or Anthropic Claude 3.5 Haiku (with streaming)

## Architecture
```
┌─────────────────┐
│   Frontend     │  NEXT.js 16 + shadcn + Jotai
│   (Vercel)      │  Streaming responses via SSE
└──────┬────────┘
       │ REST API
┌──────▼──────────┐
│   Backend      │  Elysia.js
│   (Railway/    │  Rate limiting
│   Render/      │  Error handling
│   Fly.io)      │  Streaming responses
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
│   SQLite DB     │  documents + embeddings + conversations
└───────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key or Anthropic API key

### Backend Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3001
DATABASE_PATH=./data/rag.db
LLM_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RATE_LIMIT_PER_MINUTE=10
```

3. **Start development server:**
```bash
npm run dev
```

Backend will run on `http://localhost:3001`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Configure API URL (optional):**
```bash
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

3. **Start development server:**
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## API Endpoints

### `POST /api/chat`
Chat with RAG context (streaming response)
```json
{
  "message": "What services do you offer?",
  "userId": "user-123"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"chunk":"Based","done":false}

data: {"chunk":" on","done":false}

data: {"chunk":"","done":true,"sources":2,"fullResponse":"Based on 2 documents..."}
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

**Response:**
```json
{
  "inserted": 2,
  "total": 2
}
```

### `GET /api/conversations/:userId`
Get conversation history

**Response:**
```json
{
  "userId": "user-123",
  "conversations": 5,
  "history": [...]
}
```

### `GET /api/documents/count`
Get number of indexed documents

### `GET /health`
Health check

## Deployment

### Frontend (Vercel)

1. **Connect repository to Vercel**
2. **Configure build settings:**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. **Set environment variable:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

### Backend Options

#### Option 1: Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**Environment variables on Railway:**
```
PORT=3001
DATABASE_PATH=/data/rag.db
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
RATE_LIMIT_PER_MINUTE=10
```

**Important:** Railway provides persistent disk storage at `/data`. Use this path for the database.

#### Option 2: Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables
4. Deploy

**Build Command:** `npm run build && npm run start`

**Start Command:** `node dist/index.js`

**Database persistence:** Render provides ephemeral storage. For persistence:
- Use a disk mount point (add a disk in Render dashboard)
- Set `DATABASE_PATH=/opt/render/project/data/rag.db`

#### Option 3: Fly.io
```bash
npm install -g flyctl
flyctl launch
```

**fly.toml configuration:**
```toml
[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  DATABASE_PATH = "/data/rag.db"

[mounts]
  source = "rag_data"
  destination = "/data"
```

Deploy:
```bash
flyctl deploy
flyctl secrets set OPENAI_API_KEY=sk-... LLM_PROVIDER=openai
```

### Database Persistence Considerations

**Important:** The SQLite database file must be stored in a persistent location:

| Platform | Persistent Path |
|----------|----------------|
| Railway  | `/data/rag.db` |
| Render   | `/opt/render/project/data/rag.db` (with disk) |
| Fly.io   | `/data/rag.db` (with volume mount) |
| Local    | `./data/rag.db` |

**Warning:** Without proper persistence, the database will be reset on every deployment or restart.

### Setting Environment Variables

All platforms require these variables:

```env
PORT=3001  # or platform-provided port
DATABASE_PATH=/persistent/path/to/rag.db
LLM_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-...  # for OpenAI
ANTHROPIC_API_KEY=sk-ant-...  # for Anthropic
RATE_LIMIT_PER_MINUTE=10
```

## Features

### Backend
- ✅ Streaming LLM responses (SSE)
- ✅ Rate limiting (configurable)
- ✅ Error handling & validation
- ✅ Vector similarity search
- ✅ Conversation history
- ✅ Support for OpenAI & Anthropic
- ✅ SQLite with WAL mode

### Frontend
- ✅ Real-time streaming responses
- ✅ Document upload with progress
- ✅ Chat history sidebar
- ✅ Responsive design
- ✅ Loading & error states
- ✅ Jotai state management
- ✅ shadcn/ui components

## RAG Workflow

1. **Ingestion**: Upload documents → Extract text → Generate embeddings → Store in SQLite
2. **Query**: User message → Generate embedding → Vector similarity search
3. **Generation**: Retrieved context + User message → LLM (streaming) → Response

## Development

### Backend
```bash
cd backend
npm run dev      # Development with auto-reload
npm run build    # Compile TypeScript
npm run start    # Production server
```

### Frontend
```bash
cd frontend
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Troubleshooting

### Common Issues

**1. "Failed to load embedding model"**
- Ensure you have sufficient memory (at least 2GB free)
- The model is ~200MB and runs in-memory

**2. "Rate limit exceeded"**
- Check `RATE_LIMIT_PER_MINUTE` in backend `.env`
- The limit is per IP address

**3. Database resets on deployment**
- Verify `DATABASE_PATH` points to persistent storage
- Check platform documentation for disk persistence

**4. CORS errors**
- Ensure backend has CORS enabled (default in Elysia)
- Check `NEXT_PUBLIC_API_URL` in frontend

## License

MIT
