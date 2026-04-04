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
 * Model chains: primary model + fallbacks for each use case.
 * On 429 (rate limit), the provider tries the next model in the chain.
 * Eliminates cascading failures from rate limits.
 */
export const MODEL_CHAINS: Record<string, readonly string[]> = {
  WEB_SEARCH: [
    "qwen/qwen3.6-plus:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
  ],
  ITINERARY_PLANNING: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3.6-plus:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-7b-instruct:free",
  ],
  CHAT: [
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
  REVIEW: [
    "openai/gpt-oss-120b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
  ],
} as const;

/**
 * @deprecated Use MODEL_CHAINS instead
 * Kept for backward compatibility (test script uses it)
 */
export const OPENROUTER_MODELS = {
  WEB_SEARCH: MODEL_CHAINS.WEB_SEARCH[0],
  ITINERARY_PLANNING: MODEL_CHAINS.ITINERARY_PLANNING[0],
  CHAT: MODEL_CHAINS.CHAT[0],
  REVIEW: MODEL_CHAINS.REVIEW[0],
} as const;

/**
 * Factory that returns an LLMProvider for a specific use case.
 * Passes the full model chain so the provider can fallback on 429.
 */
export function createLLMProvider(useCase?: keyof typeof MODEL_CHAINS): LLMProvider {
  const models = useCase ? MODEL_CHAINS[useCase] : MODEL_CHAINS.WEB_SEARCH;
  return new OpenRouterProvider(Array.from(models));
}

/**
 * Legacy factory for backwards compatibility (reads AI_PROVIDER env var).
 * @deprecated Use createLLMProvider(useCase) instead
 */
export function createLLMProviderLegacy(): LLMProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase() ?? "openrouter";

  switch (provider) {
    case "openrouter":
      return new OpenRouterProvider(OPENROUTER_MODELS.WEB_SEARCH);
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
      return new OpenRouterProvider(OPENROUTER_MODELS.WEB_SEARCH);
  }
}
