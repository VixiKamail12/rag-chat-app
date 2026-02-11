const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  chunk: string;
  done: boolean;
  sources?: number;
  fullResponse?: string;
  error?: string;
}

export interface Document {
  text: string;
}

export interface DocumentUploadResponse {
  inserted: number;
  total: number;
  errors?: string[];
}

export interface Conversation {
  messages: ChatMessage[];
  created_at: string;
}

export interface ConversationsResponse {
  userId: string;
  conversations: number;
  history: Conversation[];
}

export interface DocumentsCountResponse {
  count: number;
  error?: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  llm_provider: string;
  embedding_model: string;
}

// Streaming chat API
export async function streamChat(
  message: string,
  userId: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, sources: number) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE messages
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed: ChatResponse = JSON.parse(data);

            if (parsed.error) {
              onError(parsed.error);
              return;
            }

            if (parsed.chunk) {
              fullResponse += parsed.chunk;
              onChunk(parsed.chunk);
            }

            if (parsed.done) {
              onComplete(fullResponse, parsed.sources || 0);
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Chat stream error:', error);
    onError(error.message || 'Failed to connect to chat API');
  }
}

// Upload documents
export async function uploadDocuments(documents: Document[]): Promise<DocumentUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documents }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Get conversation history
export async function getConversations(userId: string): Promise<ConversationsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${userId}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Get documents count
export async function getDocumentsCount(): Promise<DocumentsCountResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/count`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Health check
export async function healthCheck(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// Retry wrapper for API calls
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      const waitTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Max retries exceeded');
}
