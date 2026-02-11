import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import Database from 'better-sqlite3';
import { pipeline } from '@huggingface/transformers';
import dotenv from 'dotenv';
import db from './db';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10', 10);

if (LLM_PROVIDER === 'openai' && !OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set, but LLM_PROVIDER is "openai"');
}
if (LLM_PROVIDER === 'anthropic' && !ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY not set, but LLM_PROVIDER is "anthropic"');
}

// Initialize LLM clients
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
}
if (ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// In-memory rate limiter (simple IP-based)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private limit: number, private windowMs: number = 60000) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // Filter out old requests outside the window
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (validRequests.length >= this.limit) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemaining(identifier: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return Math.max(0, this.limit - validRequests.length);
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT_PER_MINUTE, 60000);

// Initialize embedding model
let embedder: any = null;
try {
  embedder = await pipeline('feature-extraction', 'Xenova/gte-small');
  console.log('✅ Embedding model loaded');
} catch (error) {
  console.error('❌ Failed to load embedding model:', error);
}

// RAG: Retrieve relevant chunks
async function searchRelevantContext(query: string): Promise<string[]> {
  if (!embedder) return [];

  try {
    const queryEmbedding = await embedder(query);
    const embeddingArray = Array.from(queryEmbedding.data);

    const results = db.prepare(`
      SELECT text, created_at
      FROM documents
      ORDER BY vss_search_embeddings(embedding, ?, 5)
      LIMIT 3
    `).all(embeddingArray);

    return results.map((r: any) => r.text);
  } catch (error) {
    console.error('Error searching context:', error);
    return [];
  }
}

// Validate input length
function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (message.length > 5000) {
    return { valid: false, error: 'Message too long (max 5000 characters)' };
  }
  return { valid: true };
}

function validateDocument(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Document text cannot be empty' };
  }
  if (text.length > 100000) {
    return { valid: false, error: 'Document too long (max 100000 characters)' };
  }
  return { valid: true };
}

// Save conversation to database
function saveConversation(userId: string, messages: any[]): void {
  try {
    db.prepare(`
      INSERT INTO conversations (user_id, messages_json, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(userId, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

// Get conversation history
function getConversationHistory(userId: string, limit: number = 10): any[] {
  try {
    const results = db.prepare(`
      SELECT messages_json, created_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);

    return results.map((r: any) => ({
      messages: JSON.parse(r.messages_json),
      created_at: r.created_at
    })).reverse();
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Stream OpenAI response
async function* streamOpenAIResponse(
  prompt: string,
  context: string[]
): AsyncGenerator<string> {
  if (!openaiClient) {
    yield 'Error: OpenAI client not initialized. Please check API key.';
    return;
  }

  try {
    const contextText = context.length > 0
      ? `\n\nRelevant context:\n${context.join('\n\n---\n\n')}`
      : '';

    const stream = await openaiClient.responses.create({
      model: 'gpt-4o-mini',
      input: `You are a helpful assistant. Answer the question based on the following context if available.${contextText}\n\nQuestion: ${prompt}\n\nProvide a concise, helpful answer.`,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_delta' && chunk.content_delta?.text) {
        yield chunk.content_delta.text;
      }
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    if (error.status === 429) {
      yield 'Error: Rate limit exceeded. Please try again later.';
    } else if (error.status === 401) {
      yield 'Error: Invalid API key.';
    } else {
      yield `Error: ${error.message || 'Failed to generate response'}`;
    }
  }
}

// Stream Anthropic response
async function* streamAnthropicResponse(
  prompt: string,
  context: string[]
): AsyncGenerator<string> {
  if (!anthropicClient) {
    yield 'Error: Anthropic client not initialized. Please check API key.';
    return;
  }

  try {
    const contextText = context.length > 0
      ? `\n\nRelevant context:\n${context.join('\n\n---\n\n')}`
      : '';

    const stream = await anthropicClient.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant. Answer the question based on the following context if available.${contextText}\n\nQuestion: ${prompt}\n\nProvide a concise, helpful answer.`,
        },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        yield chunk.delta.text;
      }
    }
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    if (error.status === 429) {
      yield 'Error: Rate limit exceeded. Please try again later.';
    } else if (error.status === 401) {
      yield 'Error: Invalid API key.';
    } else {
      yield `Error: ${error.message || 'Failed to generate response'}`;
    }
  }
}

const app = new Elysia()
  .use(cors())
  .use(openapi())
  .get('/', () => 'RAG Chat API is running! 🚀')
  .get('/health', () => ({
    status: 'ok',
    database: 'connected',
    llm_provider: LLM_PROVIDER,
    embedding_model: embedder ? 'loaded' : 'not loaded'
  }))

  // Chat endpoint with streaming
  .post('/api/chat', async ({ body, set, headers }) => {
    const { message, userId = 'anonymous' } = body;

    // Rate limiting
    const ip = headers['x-forwarded-for'] as string || userId;
    if (!rateLimiter.check(ip)) {
      set.status = 429;
      return {
        error: 'Too many requests',
        message: `Rate limit exceeded. Please wait a moment.`,
        retryAfter: 60
      };
    }

    // Validate input
    const validation = validateMessage(message);
    if (!validation.valid) {
      set.status = 400;
      return { error: validation.error };
    }

    try {
      // Search relevant context
      const context = await searchRelevantContext(message);

      // Create response stream
      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';
            const streamGenerator = LLM_PROVIDER === 'anthropic'
              ? streamAnthropicResponse(message, context)
              : streamOpenAIResponse(message, context);

            for await (const chunk of streamGenerator) {
              fullResponse += chunk;
              const data = JSON.stringify({ chunk, done: false });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            // Send final message
            const finalData = JSON.stringify({
              chunk: '',
              done: true,
              sources: context.length,
              fullResponse
            });
            controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`));
            controller.close();

            // Save conversation
            saveConversation(userId, [
              { role: 'user', content: message },
              { role: 'assistant', content: fullResponse }
            ]);
          } catch (error: any) {
            console.error('Streaming error:', error);
            const errorData = JSON.stringify({
              error: error.message || 'Streaming failed',
              done: true
            });
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Rate-Limit-Remaining': rateLimiter.getRemaining(ip).toString()
        }
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      set.status = 500;
      return {
        error: 'Internal server error',
        message: error.message || 'Failed to process chat request'
      };
    }
  }, {
    body: t.Object({
      message: t.String(),
      userId: t.Optional(t.String())
    })
  })

  // Document upload endpoint
  .post('/api/documents', async ({ body, set }) => {
    const { documents } = body;

    if (!Array.isArray(documents) || documents.length === 0) {
      set.status = 400;
      return { error: 'Documents array is required' };
    }

    if (documents.length > 100) {
      set.status = 400;
      return { error: 'Too many documents (max 100 per request)' };
    }

    if (!embedder) {
      set.status = 503;
      return { error: 'Embedding model not available' };
    }

    try {
      let inserted = 0;
      const errors: string[] = [];

      for (const doc of documents) {
        const validation = validateDocument(doc.text);
        if (!validation.valid) {
          errors.push(validation.error!);
          continue;
        }

        try {
          const embedding = await embedder(doc.text);
          db.prepare(`
            INSERT INTO documents (text, embedding) VALUES (?, ?)
          `).run(doc.text, JSON.stringify(Array.from(embedding.data)));
          inserted++;
        } catch (error) {
          console.error('Error inserting document:', error);
          errors.push('Failed to process document');
        }
      }

      return {
        inserted,
        total: documents.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      console.error('Document upload error:', error);
      set.status = 500;
      return {
        error: 'Internal server error',
        message: error.message || 'Failed to upload documents'
      };
    }
  }, {
    body: t.Object({
      documents: t.Array(t.Object({
        text: t.String()
      }))
    })
  })

  // Get conversation history
  .get('/api/conversations/:userId', ({ params, set }) => {
    try {
      const history = getConversationHistory(params.userId);
      return {
        userId: params.userId,
        conversations: history.length,
        history
      };
    } catch (error: any) {
      console.error('Get conversations error:', error);
      set.status = 500;
      return {
        error: 'Failed to retrieve conversations',
        message: error.message
      };
    }
  })

  // Get documents count
  .get('/api/documents/count', () => {
    try {
      const count = db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
      return { count: count.count };
    } catch (error: any) {
      return { count: 0, error: error.message };
    }
  })

  .listen(3001);

console.log('🦊 Elysia RAG Backend running on http://localhost:3001');
console.log(`🤖 LLM Provider: ${LLM_PROVIDER}`);
console.log(`🔒 Rate Limit: ${RATE_LIMIT_PER_MINUTE} requests/minute`);
