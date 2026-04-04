import type {
  Agent,
  AgentRunContext,
  AgentResult,
  StreamEmitter,
  ResearchResult,
} from "../types";
import { WebSearchTool } from "../tools/webSearchTool";
import { now } from "../utils";

export class ResearchAgent implements Agent {
  private searchTool = new WebSearchTool();

  async run(context: AgentRunContext, emitter: StreamEmitter): Promise<AgentResult> {
    const start = Date.now();
    const { tripContext, abortSignal } = context;
    const { destinations } = tripContext.trip;
    const { members, aggregatedDietary } = tripContext;

    emitter.emit({ type: "agent_start", timestamp: now(), agentName: "ResearchAgent" });

    const researchResults: ResearchResult[] = [];

    // For each destination, build a list of specialized queries to run in parallel
    for (const destination of destinations) {
      if (abortSignal.aborted) break;
      const destStart = Date.now();

      const dietaryStr = aggregatedDietary.length > 0 ? aggregatedDietary.join(" ") : "";
      const allInterests = [...new Set(members.flatMap(m => m.interests))].filter(Boolean);
      const interestsStr = allInterests.length > 0 ? allInterests.join(" ") : "";

      // Build specialized queries
      const queries: Array<{ q: string; category: string }> = [
        { q: `${destination} top tourist attractions sightseeing must-see places`, category: "attractions" },
        { q: `${destination} best restaurants ${dietaryStr} food local cuisine dining`.trim(), category: "dining" },
        { q: `${destination} travel tips transport local customs getting around`, category: "practical" },
      ];

      // Add interest-specific query if group has interests
      if (interestsStr) {
        queries.push({
          q: `${destination} ${interestsStr} activities experiences things to do`,
          category: "activities",
        });
      }

      emitter.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "ResearchAgent",
        thought: `Researching ${destination} (${queries.length} specialized searches)...`,
      });

      // Execute all queries in parallel
      const searchPromises = queries.map(({ q, category }) =>
        (async () => {
          if (abortSignal.aborted) return { category, results: [] };

          emitter.emit({
            type: "tool_call",
            timestamp: now(),
            toolName: "web_search",
            input: { query: q },
          });

          const result = await this.searchTool.execute({ query: q }, abortSignal);
          const resultCount = result.data?.results.length ?? 0;
          const hasError = !result.success || result.error;

          emitter.emit({
            type: "tool_result",
            timestamp: now(),
            toolName: "web_search",
            success: result.success,
            summary: hasError
              ? `${category} search failed: ${result.error ?? "unknown error"}`
              : `Found ${resultCount} ${category} results for "${destination}"`,
          });

          return {
            category,
            results: result.data?.results?.map(r => ({ ...r, category })) ?? [],
          };
        })()
      );

      const searchResults = await Promise.all(searchPromises);

      // Merge all results, preserving categories and capping at 20 total items
      const mergedResults = searchResults.flatMap(sr => sr.results).slice(0, 20);

      console.info("[ResearchAgent]", {
        destination,
        queryCount: queries.length,
        queryTypes: queries.map(q => q.category).join(","),
        totalResults: mergedResults.length,
        durationMs: Date.now() - destStart,
      });

      researchResults.push({
        destination,
        searchQuery: queries.map(q => q.q).join(" | "),
        results: mergedResults,
      });
    }

    emitter.emit({
      type: "agent_thought",
      timestamp: now(),
      agentName: "ResearchAgent",
      thought: `Research complete. Gathered information for ${researchResults.length} destination(s).`,
    });

    return {
      agentName: "ResearchAgent",
      success: true,
      data: researchResults,
      durationMs: Date.now() - start,
    };
  }
}
