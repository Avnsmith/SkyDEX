import { GroqProvider } from './GroqProvider';
import { OpenRouterProvider } from './OpenRouterProvider';
import { GeminiProvider } from './GeminiProvider';

export class AIProviderManager {
  private groq = new GroqProvider();
  private openRouter = new OpenRouterProvider();
  private gemini = new GeminiProvider();

  async *executeTask(prompt: string, type: 'fast' | 'fallback' | 'long-context' = 'fast') {
    let provider;
    if (type === 'fast') provider = this.groq;
    else if (type === 'fallback') provider = this.openRouter;
    else provider = this.gemini;

    try {
      yield* provider.streamTokens(prompt);
    } catch (e) {
      console.warn(`[AIProviderManager] ${type} provider failed, failing over to OpenRouter.`);
      yield* this.openRouter.streamTokens(prompt);
    }
  }
}
