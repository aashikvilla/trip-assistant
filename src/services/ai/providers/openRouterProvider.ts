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
        // Try this model with system messages as-is
        yield* await this.streamFromModel(model, messages, usedFallback, signal);
        return; // Success!
      } catch (err) {
        if (err instanceof LLMProviderError) {
          lastError = err;

          // If 400 "Developer instruction is not enabled" — model doesn't support system role.
          // Retry once with system messages merged into first user message.
          if (err.statusCode === 400 && err.message.includes("Developer instruction is not enabled")) {
            console.warn(`[OpenRouterProvider] Model ${model} doesn't support system messages, retrying with merged format`);
            try {
              yield* await this.streamFromModel(model, this.mergeSystemIntoUser(messages), usedFallback, signal);
              return;
            } catch (innerErr) {
              if (innerErr instanceof LLMProviderError) lastError = innerErr;
            }
          }

          // If 429 and not last model, try next
          if ((err.statusCode === 429 || lastError?.statusCode === 429) && !isLastModel) {
            console.warn(
              `[OpenRouterProvider] Model ${model} rate limited (429), trying fallback model ${this.models[modelIdx + 1]}`
            );
            continue;
          }

          // Any error on non-last model → try next
          if (!isLastModel) continue;
        }
        // Last model failed — throw
        throw err;
      }
    }

    // If we get here, all models failed
    throw lastError || new LLMProviderError("openrouter", 500, "All fallback models exhausted");
  }

  /** Merge system messages into the first user message for models that don't support system role */
  private mergeSystemIntoUser(messages: LLMMessage[]): LLMMessage[] {
    const systemContent = messages
      .filter(m => m.role === "system")
      .map(m => m.content)
      .join("\n\n");

    const nonSystem = messages.filter(m => m.role !== "system");

    if (!systemContent) return nonSystem;

    if (nonSystem.length > 0 && nonSystem[0].role === "user") {
      return [
        { role: "user", content: `${systemContent}\n\n${nonSystem[0].content}` },
        ...nonSystem.slice(1),
      ];
    }

    return [{ role: "user", content: systemContent }, ...nonSystem];
  }

  private async *streamFromModel(
    model: string,
    messages: LLMMessage[],
    usedFallback: boolean,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    // Pass all messages (including system) in the messages array — OpenAI/OpenRouter format.
    // Note: body.system is Anthropic-specific and is NOT supported by OpenRouter.
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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

    const MAX_RETRIES = 1;
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

      if (response.status === 429) {
        // Respect Retry-After header if present, otherwise use backoff
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 15_000)
          : (attempt + 1) * 5_000;

        if (attempt < MAX_RETRIES) {
          console.warn(`[OpenRouterProvider] Model ${model} rate limited (429), retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        } else {
          // Exhausted retries on this model — throw to trigger fallback
          const raw = await response.text();
          lastError = new LLMProviderError("openrouter", 429, raw);
          throw lastError;
        }
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
