import type { Tool, ToolResult, LLMMessage } from "../types";
import { createLLMProvider } from "../providers";
import { cleanLLMOutput, sanitizePII } from "../utils";

export interface SearchInput {
  query: string;
}

export interface SearchResultItem {
  title: string;
  snippet: string;
}

export interface SearchOutput {
  results: SearchResultItem[];
}

export class WebSearchTool implements Tool<SearchInput, SearchOutput> {
  name = "web_search";
  description = "Research destinations, activities, and travel tips using the LLM.";

  async execute(input: SearchInput, signal?: AbortSignal): Promise<ToolResult<SearchOutput>> {
    const sanitizedQuery = sanitizePII(input.query);

    try {
      const provider = createLLMProvider();

      const messages: LLMMessage[] = [
        {
          role: "system",
          content:
            "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 8 informative results from your knowledge. Each result must have: title (string), snippet (2-3 sentence summary of useful travel info). Respond with ONLY the JSON array, no markdown fences.",
        },
        {
          role: "user",
          content: `Search query: "${sanitizedQuery}"\n\nReturn a JSON array of travel research results.`,
        },
      ];

      let raw = "";
      for await (const token of provider.streamChat(messages, undefined, signal)) {
        raw += token;
      }

      const cleaned = cleanLLMOutput(raw);
      const parsed = JSON.parse(cleaned) as unknown;

      if (!Array.isArray(parsed)) {
        return { success: true, data: { results: [] } };
      }

      const results = (parsed as Array<Record<string, unknown>>)
        .slice(0, 8)
        .map((r) => ({
          title: String(r.title ?? ""),
          snippet: String(r.snippet ?? ""),
        }))
        .filter((r) => r.title || r.snippet);

      return { success: true, data: { results } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Research failed";
      return { success: false, data: { results: [] }, error: message };
    }
  }
}
