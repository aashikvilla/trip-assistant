import type { LLMMessage, ToolDefinition } from "../types";
import { LLMProviderError } from "../types";
import type { LLMProvider } from "./index";

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private models: string[];
  private useWebSearch: boolean;

  constructor(modelsOrSingleModel?: string | string[]) {
    this.apiKey = process.env.OPENROUTER_API_KEY || "";

    // Normalize to array of models
    if (Array.isArray(modelsOrSingleModel)) {
      this.models = modelsOrSingleModel;
    } else if (modelsOrSingleModel) {
      this.models = [modelsOrSingleModel];
    } else {
      const modelConfig = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
      this.models = [modelConfig];
    }

    // Check if any model has :online suffix
    this.useWebSearch = this.models.some(m => m.toLowerCase().includes(":online"));
    // Clean up :online suffix (OpenRouter API doesn't use it)
    this.models = this.models.map(m => m.replace(/:online$/i, ""));
  }

  async *streamChat(
    messages: LLMMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.apiKey) {
      throw new LLMProviderError("openrouter", 401, "OPENROUTER_API_KEY is not configured");
    }

    // Try each model in the chain
    let lastError: LLMProviderError | null = null;

    for (let modelIdx = 0; modelIdx < this.models.length; modelIdx++) {
      const model = this.models[modelIdx];
      const isLastModel = modelIdx === this.models.length - 1;
      const usedFallback = modelIdx > 0;

      try {
        // Try this model with retries
        yield* await this.streamFromModel(model, messages, usedFallback, signal);
        return; // Success!
      } catch (err) {
        if (err instanceof LLMProviderError) {
          lastError = err;
          // If 429 and not last model, try next
          if (err.statusCode === 429 && !isLastModel) {
            console.warn(
              `[OpenRouterProvider] Model ${model} rate limited (429), trying fallback model ${this.models[modelIdx + 1]}`
            );
            continue;
          }
        }
        // On other errors or last model, throw
        throw err;
      }
    }

    // If we get here, all models failed
    throw lastError || new LLMProviderError("openrouter", 500, "All fallback models exhausted");
  }

  private async *streamFromModel(
    model: string,
    messages: LLMMessage[],
    usedFallback: boolean,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    // Separate system messages from chat messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
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
    let lastError: LLMProviderError | null = null;

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

      const latencyMs = Date.now() - fetchStart;
      console.info("[OpenRouterProvider]", {
        model,
        usedFallback,
        messageCount: messages.length,
        status: response.status,
        latencyMs,
        attempt,
      });

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = (attempt + 1) * 3000;
        console.warn(
          `[OpenRouterProvider] Model ${model} rate limited (429), retrying in ${delay}ms`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const raw = await response.text();
        lastError = new LLMProviderError("openrouter", response.status, raw);
        throw lastError;
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
