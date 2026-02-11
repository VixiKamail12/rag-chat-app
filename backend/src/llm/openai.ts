import OpenAI from 'openai';

class OpenAILLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
    });
  }

  /**
   * Send chat completion with streaming
   */
  async *chatCompletion(messages: Array<{ role: string; content: string }>) {
    const stream = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
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
}

export default OpenAILLM;
