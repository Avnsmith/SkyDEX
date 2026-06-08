import { ChatGroq } from "@langchain/groq";
import { HumanMessage } from "@langchain/core/messages";

export class GroqProvider {
  private llm: ChatGroq | undefined;

  constructor() {
    if (process.env.GROQ_API_KEY) {
      this.llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0,
      });
    }
  }

  async *streamTokens(prompt: string) {
    if (!this.llm) {
      const mockResponse = `[Groq Simulator] Processing task: ${prompt}... Analyzing DOM structure... Fetching target prices... Extracting JSON payload... Task complete.`;
      const words = mockResponse.split(' ');
      for (const word of words) {
        yield word + ' ';
        await new Promise(r => setTimeout(r, 100)); 
      }
      return;
    }

    try {
      const stream = await this.llm.stream([new HumanMessage(prompt)]);
      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content.toString();
        }
      }
    } catch (e) {
      console.error("[GroqProvider] Error streaming from Groq:", e);
      throw e;
    }
  }
}

