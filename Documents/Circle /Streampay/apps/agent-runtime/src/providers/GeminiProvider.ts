export class GeminiProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  async *streamTokens(prompt: string) {
    if (!this.apiKey) {
      const mockResponse = `[Gemini Simulator] Executing long-context reasoning for: ${prompt}... Synthesizing data points... Context length 128k... Done.`;
      const words = mockResponse.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise(r => setTimeout(r, 120));
      }
      return;
    }
    yield "[Gemini Live] Token streaming active...";
  }
}
