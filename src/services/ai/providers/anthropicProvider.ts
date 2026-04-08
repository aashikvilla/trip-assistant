import Anthropic from "@anthropic-ai/sdk";
import type { LLMMessage, ToolDefinition } from "../types";
import type { LLMProvider } from "./index";

/**
 * LLM provider backed by the Anthropic API.
 * Used when ANTHROPIC_API_KEY is set — avoids free-tier quota limits on OpenRouter.
 *
 * Model selection (in order):
 *   1. ANTHROPIC_MODEL env var (explicit override)
 *   2. claude-haiku-4-5-20251001 for WEB_SEARCH / CHAT / REVIEW (fast, cheap)
 *   3. claude-sonnet-4-6 for ITINERARY_PLANNING (best quality for structured JSON)
 */
export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(useCase?: string) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (process.env.ANTHROPIC_MODEL) {
      this.model = process.env.ANTHROPIC_MODEL;
    } else if (useCase === "ITINERARY_PLANNING" || useCase === "REVIEW") {
      this.model = "claude-sonnet-4-6";
    } else {
      this.model = "claude-haiku-4-5-20251001";
    }
  }

  async *streamChat(
    messages: LLMMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Separate system messages from conversation messages
    const systemParts = messages.filter(m => m.role === "system").map(m => m.content);
    const conversationMessages = messages.filter(m => m.role !== "system");

    if (conversationMessages.length === 0) {
      throw new Error("No user or assistant messages provided");
    }

    const requestParams: Anthropic.MessageCreateParamsStreaming = {
      model: this.model,
      max_tokens: 4096,
      stream: true,
      messages: conversationMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    };

    if (systemParts.length > 0) {
      requestParams.system = systemParts.join("\n\n");
    }

    const stream = this.client.messages.stream(requestParams);

    try {
      for await (const event of stream) {
        if (signal?.aborted) {
          stream.abort();
          return;
        }
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    } finally {
      // Ensure stream is cleaned up on early exit
    }
  }
}
