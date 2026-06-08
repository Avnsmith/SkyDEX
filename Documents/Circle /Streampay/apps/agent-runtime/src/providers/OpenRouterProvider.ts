export class OpenRouterProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  async *streamTokens(prompt: string) {
    if (!this.apiKey) {
      const mockResponse = `[OpenRouter Simulator] Falling back to DeepSeek routing for: ${prompt}... Executing safely... Done.`;
      const words = mockResponse.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise(r => setTimeout(r, 150));
      }
      return;
    }
    
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          stream: true
        })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (e) {
      console.error("[OpenRouter] Streaming failed:", e);
      throw e;
    }
  }
}

