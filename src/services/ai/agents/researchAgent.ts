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

    emitter.emit({ type: "agent_start", timestamp: now(), agentName: "ResearchAgent" });

    const researchResults: ResearchResult[] = [];

    for (const destination of destinations) {
      if (abortSignal.aborted) break;

      const query = `${destination} travel guide attractions activities things to do tips`;

      emitter.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "ResearchAgent",
        thought: `Searching for travel information about ${destination}...`,
      });

      emitter.emit({
        type: "tool_call",
        timestamp: now(),
        toolName: "web_search",
        input: { query },
      });

      const result = await this.searchTool.execute({ query }, abortSignal);

      emitter.emit({
        type: "tool_result",
        timestamp: now(),
        toolName: "web_search",
        success: result.success,
        summary: result.success
          ? `Found ${result.data?.results.length ?? 0} results for "${destination}"`
          : `Search failed: ${result.error ?? "unknown error"}`,
      });

      researchResults.push({
        destination,
        searchQuery: query,
        results: result.data?.results ?? [],
      });

      // Also search for food/dining
      if (!abortSignal.aborted) {
        const foodQuery = `${destination} best restaurants food local cuisine dining`;

        emitter.emit({
          type: "agent_thought",
          timestamp: now(),
          agentName: "ResearchAgent",
          thought: `Researching dining options in ${destination}...`,
        });

        emitter.emit({
          type: "tool_call",
          timestamp: now(),
          toolName: "web_search",
          input: { query: foodQuery },
        });

        const foodResult = await this.searchTool.execute({ query: foodQuery }, abortSignal);

        emitter.emit({
          type: "tool_result",
          timestamp: now(),
          toolName: "web_search",
          success: foodResult.success,
          summary: foodResult.success
            ? `Found ${foodResult.data?.results.length ?? 0} dining results for "${destination}"`
            : `Dining search failed`,
        });

        // Merge food results into the destination research
        if (foodResult.data?.results.length) {
          const existing = researchResults.find((r) => r.destination === destination);
          if (existing) {
            existing.results = [...existing.results, ...foodResult.data.results].slice(0, 10);
          }
        }
      }
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
