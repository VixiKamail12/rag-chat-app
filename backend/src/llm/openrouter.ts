import OpenAI from 'openai';

interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultHeaders?: {
    'HTTP-Referer'?: string;
    'X-Title'?: string;
  };
}

class OpenRouterLLM {
  private client: OpenAI;
  private freeModelIds: string[];

  constructor(config: OpenRouterConfig) {
    // List of free models (as of 2026-02)
    this.freeModelIds = [
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'google/gemma-2-9b-it',
      'microsoft/wizardlm-2-8x22b',
      'huggingfaceh4/zephyr-7b-beta',
      'mistralai/mistral-7b-instruct-v0.3',
    ];

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      defaultHeaders: config.defaultHeaders,
    });
  }

  /**
   * Get the best free model or fallback to first available
   */
  private selectFreeModel(): string {
    // Default to first free model
    const defaultModel = this.freeModelIds[0];

    // Check if we have a preferred model in env
    const preferredModel = process.env.PREFERRED_FREE_MODEL;
    if (preferredModel && this.freeModelIds.includes(preferredModel)) {
      return preferredModel;
    }

    return defaultModel;
  }

  /**
   * Send chat completion with streaming
   */
  async *chatCompletion(messages: Array<{ role: string; content: string }>) {
    const model = this.selectFreeModel();

    const stream = await this.client.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  }

  /**
   * Get list of available free models
   */
  getAvailableFreeModels(): string[] {
    return this.freeModelIds;
  }
}

export default OpenRouterLLM;
