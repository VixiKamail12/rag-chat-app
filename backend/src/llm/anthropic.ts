import Anthropic from '@anthropic-ai/sdk';

class AnthropicLLM {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Send chat completion with streaming
   */
  async *chatCompletion(messages: Array<{ role: string; content: string }>) {
    const stream = await this.client.messages.create({
      model: 'claude-3-haiku',
      max_tokens: 2000,
      messages,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta?.text) {
          yield event.delta.text;
        }
      }
    }
  }
}

export default AnthropicLLM;
