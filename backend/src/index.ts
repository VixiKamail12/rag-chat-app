import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import Database from 'better-sqlite3';
import { pipeline } from '@huggingface/transformers';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database(process.env.DATABASE_PATH || './data/rag.db');

// Initialize embedding model
const embedder = await pipeline('feature-extraction', 'Xenova/gte-small');

// RAG: Retrieve relevant chunks
async function searchRelevantContext(query: string): Promise<string[]> {
  const queryEmbedding = await embedder(query);
  const results = await db.query(`
    SELECT text, distance
    FROM documents
    ORDER BY vss_search_embeddings(embedding, ?, 5)
    LIMIT 3
  `, [Array.from(queryEmbedding.data)]);

  return results.map((r: any) => r.text);
}

const app = new Elysia()
  .use(cors())
  .use(openapi())
  .get('/', () => 'RAG Chat API is running! 🚀')
  .get('/health', () => ({ status: 'ok', database: 'connected' }))
  .post('/api/chat', async ({ body }) => {
    const { message } = body;

    // 1. Search relevant context
    const context = await searchRelevantContext(message);

    // 2. Build prompt with context
    const prompt = `You are a helpful assistant. Answer the question based on the following context:\n\n${context.join('\n\n')}\n\nQuestion: ${message}`;

    // 3. Call LLM (implement your preferred API)
    // For now, return context-based answer
    return {
      answer: `Based on ${context.length} relevant documents found...`,
      sources: context.length
    };
  })
  .post('/api/documents', async ({ body }) => {
    const { documents } = body;

    // Insert documents with embeddings
    for (const doc of documents) {
      const embedding = await embedder(doc.text);
      await db.run(`
        INSERT INTO documents (text, embedding) VALUES (?, ?)
      `, [doc.text, JSON.stringify(Array.from(embedding.data))]);
    }

    return { inserted: documents.length };
  })
  .listen(3001);

console.log('🦊 Elysia RAG Backend running on http://localhost:3001');
