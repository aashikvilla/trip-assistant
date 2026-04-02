import type { LLMMessage, ToolDefinition } from "../types";
import { OpenRouterProvider } from "./openRouterProvider";
import { OllamaProvider } from "./ollamaProvider";
import { OpenAICompatibleProvider } from "./openAICompatibleProvider";

export interface LLMProvider {
  streamChat(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;
}

/**
 * Factory that reads AI_PROVIDER env var and returns the appropriate LLMProvider.
 * Defaults to openrouter with a warning if the value is unrecognised.
 */
export function createLLMProvider(): LLMProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() ?? "openrouter";

  switch (provider) {
    case "openrouter":
      return new OpenRouterProvider();
    case "ollama":
      return new OllamaProvider();
    case "lmstudio":
    case "anythingllm":
    case "openai-compatible":
      return new OpenAICompatibleProvider(provider);
    default:
      console.warn(
        `[AI] Unrecognised AI_PROVIDER="${provider}". Falling back to openrouter.`,
      );
      return new OpenRouterProvider();
  }
}
