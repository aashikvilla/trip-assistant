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
 * Hardcoded optimal free models from OpenRouter for each use case.
 * All models use the :free tier (no cost, rate limited to 200 req/day).
 */
export const OPENROUTER_MODELS = {
  // Web search / research - Qwen 3.6 Plus: Latest Qwen, 1M context, great for research
  WEB_SEARCH: "qwen/qwen3.6-plus:free",

  // Itinerary planning - Llama 3.3 70B: Best structured output, instruction following
  ITINERARY_PLANNING: "meta-llama/llama-3.3-70b-instruct:free",

  // Chat/conversation - Gemma 3 27B: Fast, good for casual conversation
  CHAT: "google/gemma-3-27b-it:free",

  // Review/validation - GPT-OSS 120B: Strong reasoning for constraint checking
  REVIEW: "openai/gpt-oss-120b:free",
} as const;

/**
 * Factory that returns an LLMProvider for a specific use case.
 * Uses hardcoded optimal free models from OpenRouter.
 */
export function createLLMProvider(useCase?: keyof typeof OPENROUTER_MODELS): LLMProvider {
  const model = useCase ? OPENROUTER_MODELS[useCase] : OPENROUTER_MODELS.WEB_SEARCH;
  return new OpenRouterProvider(model);
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
