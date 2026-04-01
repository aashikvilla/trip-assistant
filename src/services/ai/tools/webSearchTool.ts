import type { Tool, ToolResult } from "../types";
import { sanitizePII } from "../utils";

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
  description = "Search the web for information about destinations, activities, and travel tips.";

  async execute(input: SearchInput, signal?: AbortSignal): Promise<ToolResult<SearchOutput>> {
    const sanitizedQuery = sanitizePII(input.query);
    const provider = process.env.SEARCH_PROVIDER?.toLowerCase() ?? "tavily";

    try {
      const timeoutSignal = AbortSignal.timeout(10_000);
      const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

      let results: SearchResultItem[] = [];

      if (provider === "brave") {
        results = await this.searchBrave(sanitizedQuery, combinedSignal);
      } else {
        results = await this.searchTavily(sanitizedQuery, combinedSignal);
      }

      return { success: true, data: { results } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      return { success: false, data: { results: [] }, error: message };
    }
  }

  private async searchTavily(
    query: string,
    signal: AbortSignal,
  ): Promise<SearchResultItem[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return [];
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 10,
        search_depth: "basic",
      }),
      signal,
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
    signal: AbortSignal,
  ): Promise<SearchResultItem[]> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return [];
    }

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
      signal,
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
