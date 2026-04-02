import type { Tool, ToolResult, LLMMessage } from "../types";
import { createLLMProvider } from "../providers";
import { cleanLLMOutput, sanitizePII } from "../utils";

export interface SearchInput {
  query: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOutput {
  results: SearchResultItem[];
}

export class WebSearchTool implements Tool<SearchInput, SearchOutput> {
  name = "web_search";
  description = "Search for information about destinations, activities, and travel tips.";

  async execute(input: SearchInput, signal?: AbortSignal): Promise<ToolResult<SearchOutput>> {
    const sanitizedQuery = sanitizePII(input.query);
    const searchProvider = process.env.SEARCH_PROVIDER?.toLowerCase();

    try {
      let results: SearchResultItem[] = [];

      if (searchProvider === "tavily" && process.env.TAVILY_API_KEY) {
        results = await this.searchTavily(sanitizedQuery, signal);
      } else if (searchProvider === "brave" && process.env.BRAVE_SEARCH_API_KEY) {
        results = await this.searchBrave(sanitizedQuery, signal);
      } else {
        // Default: use the LLM itself to synthesize destination research
        results = await this.searchViaLLM(sanitizedQuery, signal);
      }

      return { success: true, data: { results } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      return { success: false, data: { results: [] }, error: message };
    }
  }

  /**
   * Uses the configured LLM to generate travel research from its training knowledge.
   * This is the default — no extra API key required.
   */
  private async searchViaLLM(
    query: string,
    signal?: AbortSignal,
  ): Promise<SearchResultItem[]> {
    const provider = createLLMProvider();

    const messages: LLMMessage[] = [
      {
        role: "system",
        content:
          "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 8 informative results drawn from your knowledge. Each result must have: title, url (use a plausible reference URL), snippet (2-3 sentence summary of useful travel information). Respond with ONLY the JSON array, no markdown fences.",
      },
      {
        role: "user",
        content: `Search query: "${query}"\n\nReturn a JSON array of travel research results.`,
      },
    ];

    let raw = "";
    for await (const token of provider.streamChat(messages, undefined, signal)) {
      raw += token;
    }

    const cleaned = cleanLLMOutput(raw);
    const parsed = JSON.parse(cleaned) as unknown;

    if (!Array.isArray(parsed)) return [];

    return (parsed as Array<Record<string, unknown>>)
      .slice(0, 8)
      .map((r) => ({
        title: String(r.title ?? ""),
        url: String(r.url ?? ""),
        snippet: String(r.snippet ?? ""),
      }))
      .filter((r) => r.title || r.snippet);
  }

  private async searchTavily(
    query: string,
    signal?: AbortSignal,
  ): Promise<SearchResultItem[]> {
    const timeoutSignal = AbortSignal.timeout(10_000);
    const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 10,
        search_depth: "basic",
      }),
      signal: combined,
    });

    if (!response.ok) return [];

    const data = await response.json() as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    return (data.results ?? []).slice(0, 10).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.content ?? "",
    }));
  }

  private async searchBrave(
    query: string,
    signal?: AbortSignal,
  ): Promise<SearchResultItem[]> {
    const timeoutSignal = AbortSignal.timeout(10_000);
    const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
      },
      signal: combined,
    });

    if (!response.ok) return [];

    const data = await response.json() as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    return (data.web?.results ?? []).slice(0, 10).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: r.description ?? "",
    }));
  }
}
