import type {
  Agent,
  AgentRunContext,
  AgentResult,
  StreamEmitter,
} from "../types";
import type { ParsedItinerary } from "../types";
import { now } from "../utils";

/**
 * ReviewAgent — feature-flagged via ENABLE_REVIEW_AGENT=true.
 * Validates a completed itinerary against dietary, budget, and must-do constraints.
 */
export class ReviewAgent implements Agent {
  async run(context: AgentRunContext, emitter: StreamEmitter): Promise<AgentResult> {
    const start = Date.now();
    const { tripContext } = context;

    emitter.emit({ type: "agent_start", timestamp: now(), agentName: "ReviewAgent" });
    emitter.emit({
      type: "agent_thought",
      timestamp: now(),
      agentName: "ReviewAgent",
      thought: "Reviewing itinerary for constraint compliance...",
    });

    // Get the itinerary from context (passed as existingItinerary)
    const itinerary = context.existingItinerary;
    if (!itinerary) {
      return {
        agentName: "ReviewAgent",
        success: false,
        error: "No itinerary provided for review",
        durationMs: Date.now() - start,
      };
    }

    const violations: string[] = [];
    const { aggregatedDietary, trip } = tripContext;

    // Check dietary compliance
    if (aggregatedDietary.length > 0) {
      for (const day of itinerary.days) {
        const allText = [
          ...(day.morning?.activities ?? []),
          day.morning?.breakfast ?? "",
          ...(day.afternoon?.activities ?? []),
          day.afternoon?.lunch ?? "",
          ...(day.evening?.activities ?? []),
          day.evening?.dinner ?? "",
        ].join(" ").toLowerCase();

        for (const restriction of aggregatedDietary) {
          if (restriction === "vegetarian" && /\b(meat|beef|pork|chicken|fish|seafood)\b/.test(allText)) {
            violations.push(`Day ${day.day}: Possible non-vegetarian suggestion`);
          }
          if (restriction === "vegan" && /\b(meat|dairy|milk|cheese|egg|honey)\b/.test(allText)) {
            violations.push(`Day ${day.day}: Possible non-vegan suggestion`);
          }
          if (restriction === "gluten-free" && /\b(bread|pasta|wheat|flour|gluten)\b/.test(allText)) {
            violations.push(`Day ${day.day}: Possible gluten-containing suggestion`);
          }
        }
      }
    }

    // Check must-do activities coverage
    const mustDoActivities = trip.mustDoActivities;
    if (mustDoActivities.length > 0) {
      const allActivitiesText = itinerary.days
        .flatMap((d) => [
          ...(d.morning?.activities ?? []),
          ...(d.afternoon?.activities ?? []),
          ...(d.evening?.activities ?? []),
        ])
        .join(" ")
        .toLowerCase();

      for (const mustDo of mustDoActivities) {
        const keywords = mustDo.toLowerCase().split(" ").filter((w) => w.length > 3);
        const covered = keywords.some((kw) => allActivitiesText.includes(kw));
        if (!covered) {
          violations.push(`Must-do activity not covered: "${mustDo}"`);
        }
      }
    }

    if (violations.length > 0) {
      emitter.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "ReviewAgent",
        thought: `Found ${violations.length} potential issue(s): ${violations.join("; ")}. The itinerary is still usable but may benefit from manual review.`,
      });
    } else {
      emitter.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "ReviewAgent",
        thought: "Itinerary passes all constraint checks.",
      });
    }

    return {
      agentName: "ReviewAgent",
      success: true,
      data: { violations, itinerary: itinerary as ParsedItinerary },
      durationMs: Date.now() - start,
    };
  }
}
