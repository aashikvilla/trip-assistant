import type { LLMMessage, ToolDefinition } from "../types";
import { LLMProviderError } from "../types";
import type { LLMProvider } from "./index";

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private useWebSearch: boolean;

  constructor(modelOverride?: string) {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";

    if (modelOverride) {
      // Use provided model directly
      this.useWebSearch = modelOverride.toLowerCase().includes(":online");
      this.model = this.useWebSearch
        ? modelOverride.replace(/:online$/i, "")
        : modelOverride;
    } else {
      // Fall back to env var
      const modelConfig = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
      this.useWebSearch = modelConfig.toLowerCase().includes(":online");
      this.model = this.useWebSearch
        ? modelConfig.replace(/:online$/i, "")
        : modelConfig;
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new LLMProviderError("openrouter", 401, "OPENROUTER_API_KEY is not configured");
    }

    // Separate system messages from chat messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model: this.model,
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    };

    // Enable web search plugin if configured
    if (this.useWebSearch) {
      body.plugins = [
        {
          id: "web",
          max_results: 5,
          engine: "native",
        },
      ];
    }

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join("\n");
    }

    const MAX_RETRIES = 2;
    let response: Response | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) throw new LLMProviderError("openrouter", 0, "Aborted");

      const fetchStart = Date.now();
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Vibe Trip",
        },
        body: JSON.stringify(body),
        signal,
      });

      console.info("[OpenRouterProvider]", { model: this.model, webSearch: this.useWebSearch, messageCount: messages.length, status: response.status, latencyMs: Date.now() - fetchStart, attempt });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 3000;
        console.warn("[OpenRouterProvider] Rate limited (429), retrying in", delay, "ms");
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      break;
    }

    if (!response!.ok) {
      const raw = await response!.text();
      throw new LLMProviderError("openrouter", response!.status, raw);
    }

    const reader = response!.body?.getReader();
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
