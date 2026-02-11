import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import Database from 'better-sqlite3';
import { pipeline } from '@huggingface/transformers';
import dotenv from 'dotenv';
import OpenRouterLLM from './llm/openrouter';

dotenv.config();

const db = new Database(process.env.DATABASE_PATH || './data/rag.db');

// Initialize embedding model
const embedder = await pipeline('feature-extraction', 'Xenova/gte-small');

// Initialize LLM client with OpenRouter
const llm = new OpenRouterLLM({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/VixiKamail12/rag-chat-app',
    'X-Title': 'RAG Chat App',
  },
});

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
  .get('/', () => 'RAG Chat API is running! 🦊 Powered by OpenRouter')
  .get('/health', () => ({ status: 'ok', database: 'connected', llm: 'openrouter' }))
  .get('/api/models', () => ({ models: llm.getAvailableFreeModels() }))
  .post('/api/chat', async ({ body }) => {
    const { message, conversationHistory } = body;

    // 1. Search relevant context
    const context = await searchRelevantContext(message);

    // 2. Build messages with context
    const messages = [
      { role: 'system', content: `You are a helpful assistant. Answer the question based on the following context about the company and services:\n\n${context.join('\n\n')}\n\nUse this context to provide accurate information. If the context doesn't contain relevant information, say so politely.` },
      ...(conversationHistory || []),
      { role: 'user', content: message },
    ];

    // 3. Set up Server-Sent Events (SSE) for streaming
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of llm.chatCompletion(messages)) {
              // Send chunk to client
              const data = `data: ${JSON.stringify({ chunk })}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));

              // Small delay to prevent overwhelming the client
              await new Promise((resolve) => setTimeout(resolve, 10));
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      },
    );
  })
  .post('/api/documents', async ({ body }) => {
    const { documents } = body;

    // Validate input
    if (!Array.isArray(documents) || documents.length === 0) {
      throw { message: 'Documents array is required', status: 400 };
    }

    // Insert documents with embeddings
    for (const doc of documents) {
      if (!doc.text || doc.text.length > 100000) {
        throw { message: 'Document text is required and must be <= 100000 chars', status: 400 };
      }

      const embedding = await embedder(doc.text);
      await db.run(`
        INSERT INTO documents (text, embedding) VALUES (?, ?)
      `, [doc.text, JSON.stringify(Array.from(embedding.data))]);
    }

    return { inserted: documents.length, message: 'Documents processed successfully' };
  })
  .listen(3001);

console.log('🦊 Elysia RAG Backend running on http://localhost:3001 with OpenRouter LLM');
