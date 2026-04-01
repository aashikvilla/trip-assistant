import type { LLMMessage, ToolDefinition } from "../types";
import { LLMProviderError } from "../types";
import type { LLMProvider } from "./index";

export class OpenAICompatibleProvider implements LLMProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
    this.baseUrl = process.env.LLM_BASE_URL || "http://localhost:1234";
    this.apiKey = process.env.LLM_API_KEY || "local";
    this.model = process.env.LLM_MODEL || "local-model";
  }

  async *streamChat(
    messages: LLMMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        max_tokens: 8000,
        temperature: 0.7,
      }),
      signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new LLMProviderError(this.providerName, response.status, raw);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6)) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const token = json.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
