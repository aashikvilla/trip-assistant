import type { LLMMessage, ToolDefinition } from "../types";
import { LLMProviderError } from "../types";
import type { LLMProvider } from "./index";

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3";
  }

  async *streamChat(
    messages: LLMMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new LLMProviderError("ollama", response.status, raw);
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
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line) as {
              message?: { content?: string };
              done?: boolean;
            };
            if (json.message?.content) yield json.message.content;
          } catch {
            // Skip malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
