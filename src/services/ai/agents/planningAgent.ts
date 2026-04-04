import type {
  Agent,
  AgentRunContext,
  AgentResult,
  StreamEmitter,
  ResearchResult,
  TripContext,
  TripRecommendation,
} from "../types";
import type { ParsedItinerary, ParsedItineraryDay } from "../types";
import { ParsedItineraryDaySchema } from "../schemas";
import { cleanLLMOutput, now } from "../utils";
import { createLLMProvider } from "../providers";
import type { LLMProvider } from "../providers";
import type { LLMMessage } from "../types";

export class PlanningAgent implements Agent {
  private provider: LLMProvider;

  constructor() {
    this.provider = createLLMProvider("ITINERARY_PLANNING");
  }

  async run(context: AgentRunContext, emitter: StreamEmitter): Promise<AgentResult> {
    const start = Date.now();
    const { tripContext, researchResults, existingItinerary, dayNumber, reason, abortSignal } = context;

    emitter.emit({ type: "agent_start", timestamp: now(), agentName: "PlanningAgent" });
    emitter.emit({
      type: "agent_thought",
      timestamp: now(),
      agentName: "PlanningAgent",
      thought: "Analyzing trip details and building personalized itinerary...",
    });

    const days: ParsedItineraryDay[] = [];
    const isPartialReplan = dayNumber !== undefined;
    const totalDays = tripContext.trip.tripLengthDays;
    const daysToGenerate = isPartialReplan ? [dayNumber] : Array.from({ length: totalDays }, (_, i) => i + 1);

    const systemPrompt = this.buildSystemPrompt(tripContext, researchResults, existingItinerary);

    // Check if research returned empty results - warn user once
    const hasResearchData = researchResults && researchResults.some(r => r.results?.length > 0);
    if (!hasResearchData) {
      emitter.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "PlanningAgent",
        thought: "No web search data available. Planning itinerary using general knowledge and group preferences...",
      });
    }

    // Generate all days in parallel
    const dayGenerationPromises = daysToGenerate.map(dayNum =>
      this.generateSingleDay(dayNum, systemPrompt, tripContext, researchResults, existingItinerary, reason, abortSignal, emitter)
    );

    const generatedDays = await Promise.all(dayGenerationPromises);

    // Sort by day number (parallel execution may complete out of order)
    const days_sorted = generatedDays.sort((a, b) => a.day - b.day);
    days.push(...days_sorted);

    const itinerary: ParsedItinerary = {
      days,
      closing_note: this.buildClosingNote(tripContext),
    };

    emitter.emit({
      type: "agent_thought",
      timestamp: now(),
      agentName: "PlanningAgent",
      thought: `Itinerary planning complete! Generated ${days.length} day(s).`,
    });

    return {
      agentName: "PlanningAgent",
      success: true,
      data: itinerary,
      durationMs: Date.now() - start,
    };
  }

  private async generateSingleDay(
    dayNum: number,
    systemPrompt: string,
    tripContext: TripContext,
    researchResults?: ResearchResult[],
    existingItinerary?: ParsedItinerary,
    reason?: string,
    abortSignal?: AbortSignal,
    emitter?: StreamEmitter,
  ): Promise<ParsedItineraryDay> {
    if (abortSignal?.aborted) {
      return this.createFallbackDay(dayNum, tripContext);
    }

    const dayStart = Date.now();

    emitter?.emit({
      type: "agent_thought",
      timestamp: now(),
      agentName: "PlanningAgent",
      thought: `Planning Day ${dayNum}${reason ? ` (reason: ${reason})` : ""}...`,
    });

    const userPrompt = this.buildDayPrompt(tripContext, dayNum, researchResults, existingItinerary, reason);

    let parsedDay: ParsedItineraryDay | null = null;
    let lastError = "";
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abortSignal?.aborted) break;

      try {
        const messages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        if (attempt > 0) {
          messages.push({
            role: "user",
            content: `The previous response failed validation: ${lastError}. Please try again and ensure the JSON exactly matches the required schema.`,
          });
        }

        let rawOutput = "";
        for await (const token of this.provider.streamChat(messages, undefined, abortSignal)) {
          rawOutput += token;
        }

        const cleaned = cleanLLMOutput(rawOutput);
        const parsed = JSON.parse(cleaned) as unknown;
        const validation = ParsedItineraryDaySchema.safeParse(parsed);

        if (validation.success) {
          parsedDay = validation.data as ParsedItineraryDay;
          console.info("[PlanningAgent]", { dayNum, attempt, durationMs: Date.now() - dayStart });
          break;
        } else {
          lastError = validation.error.message;
          console.warn("[PlanningAgent]", { dayNum, attempt, validationError: lastError });
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.warn("[PlanningAgent]", { dayNum, attempt, error: lastError });

        if (attempt === MAX_RETRIES) {
          // Return fallback day on final failure
          parsedDay = this.createFallbackDay(dayNum, tripContext);
          this.warnIfGeneric(parsedDay);
          console.warn("[PlanningAgent]", { dayNum, fallbackUsed: true });
        }
      }
    }

    if (!parsedDay) {
      parsedDay = this.createFallbackDay(dayNum, tripContext);
      this.warnIfGeneric(parsedDay);
    }

    // Emit partial itinerary event as each day completes
    emitter?.emit({
      type: "partial_itinerary",
      timestamp: now(),
      day: parsedDay,
    });

    return parsedDay;
  }

  private createFallbackDay(dayNum: number, tripContext: TripContext): ParsedItineraryDay {
    return {
      day: dayNum,
      title: `Day ${dayNum} in ${tripContext.trip.destinations[0] ?? "your destination"}`,
      morning: { activities: ["Explore the local area"] },
      afternoon: { activities: ["Visit a local attraction"] },
      evening: { activities: ["Dinner at a local restaurant"] },
    };
  }

  private warnIfGeneric(day: ParsedItineraryDay): void {
    const genericPhrases = ["Explore the local area", "Visit a local attraction", "Dinner at a local restaurant"];
    const allText = [
      day.morning?.activities?.join(" "),
      day.afternoon?.activities?.join(" "),
      day.evening?.activities?.join(" "),
    ]
      .filter(Boolean)
      .join(" ");

    if (genericPhrases.some(phrase => allText.includes(phrase))) {
      console.warn(`[PlanningAgent] WARN: Generic fallback detected on day ${day.day}`);
    }
  }

  private buildSystemPrompt(
    tripContext: TripContext,
    researchResults?: ResearchResult[],
    _existingItinerary?: ParsedItinerary,
  ): string {
    const { trip, aggregatedDietary, coTravelerRecommendations, members } = tripContext;

    let prompt = `You are an expert travel planner. Generate a single day's itinerary as valid JSON.

TRIP CONTEXT:
- Destination(s): ${trip.destinations.join(", ")}
- Travel style: ${trip.travelStyle}
- Vibe: ${trip.vibe}
- Budget: ${trip.budget}
- Activity level: ${trip.activityLevel}
- Must-do activities: ${trip.mustDoActivities.join(", ") || "none specified"}`;

    // Add group member interests (critical for personalization)
    const allInterests = [...new Set(members.flatMap(m => m.interests))].filter(Boolean);
    if (allInterests.length > 0) {
      prompt += `\n- Group interests (personalize activities to these): ${allInterests.join(", ")}`;
    }
    prompt += `\n- Group size: ${members.length} traveler(s)`;

    if (aggregatedDietary.length > 0) {
      prompt += `\n- Dietary restrictions (MUST follow): ${aggregatedDietary.join(", ")}`;
    }

    if (researchResults && researchResults.length > 0) {
      prompt += "\n\nRESEARCH INSIGHTS:";
      for (const research of researchResults) {
        if (research.results.length > 0) {
          prompt += `\n${research.destination}:`;
          research.results.slice(0, 5).forEach((r) => {
            prompt += `\n  - ${r.title}: ${r.snippet.slice(0, 150)}`;
          });
        }
      }
    }

    if (coTravelerRecommendations.length > 0) {
      prompt += "\n\nCO-TRAVELER RECOMMENDATIONS (from your travel network):";
      coTravelerRecommendations.forEach((rec: TripRecommendation) => {
        prompt += `\n  - ${rec.recommenderName} recommends for ${rec.destination}: "${rec.text}"`;
      });
    }

    prompt += `

OUTPUT FORMAT - respond with ONLY this JSON structure, no markdown fences:
{
  "day": <number>,
  "title": "<day theme>",
  "morning": {
    "activities": ["<activity 1>", "<activity 2>"],
    "breakfast": "<breakfast recommendation>"
  },
  "afternoon": {
    "activities": ["<activity 1>", "<activity 2>"],
    "lunch": "<lunch recommendation>"
  },
  "evening": {
    "activities": ["<activity 1>"],
    "dinner": "<dinner recommendation>",
    "local_travel": "<optional transport tip>"
  },
  "hotel_recommendations": ["<hotel 1>", "<hotel 2>"]
}

Rules:
- 2-3 activities per time period (morning/afternoon/evening)
- All food suggestions must respect dietary restrictions: ${aggregatedDietary.join(", ") || "none"}
- Be specific with real place names (not generic like "explore" or "visit")
- Match the budget level (${trip.budget}) in all recommendations
- Tailor activities to group interests: ${allInterests.join(", ") || "general travel"}
- Hotel recommendations only needed on Day 1`;

    return prompt;
  }

  private buildDayPrompt(
    tripContext: TripContext,
    dayNum: number,
    researchResults?: ResearchResult[],
    existingItinerary?: ParsedItinerary,
    reason?: string,
  ): string {
    const { trip } = tripContext;
    const startDate = new Date(trip.startDate);
    startDate.setDate(startDate.getDate() + dayNum - 1);
    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let prompt = `Generate the itinerary for Day ${dayNum} of ${trip.tripLengthDays} (${dateStr}).`;

    if (reason) {
      prompt += `\nReason for replanning: ${reason}`;
    }

    if (existingItinerary) {
      const otherDays = existingItinerary.days.filter((d) => d.day !== dayNum);
      if (otherDays.length > 0) {
        prompt += "\n\nOther days context (do not repeat these activities):";
        otherDays.slice(0, 3).forEach((d) => {
          const morningActs = d.morning?.activities?.join(", ") ?? "";
          const afternoonActs = d.afternoon?.activities?.join(", ") ?? "";
          prompt += `\n  Day ${d.day}: ${morningActs}, ${afternoonActs}`.slice(0, 200);
        });
      }
    }

    const primaryDestination = trip.destinations[0] ?? "the destination";
    const searchContext = researchResults?.find((r) =>
      r.destination.toLowerCase().includes(primaryDestination.toLowerCase()),
    );

    if (searchContext && searchContext.results.length > 0) {
      prompt += "\n\nRelevant search results for inspiration:";
      searchContext.results.slice(0, 3).forEach((r) => {
        prompt += `\n  - ${r.snippet.slice(0, 200)}`;
      });
    }

    prompt += `\n\nRespond with ONLY the JSON object for day ${dayNum}. Set "day": ${dayNum}.`;

    return prompt;
  }

  private buildClosingNote(tripContext: TripContext): string {
    const { trip } = tripContext;
    return `Enjoy your ${trip.tripLengthDays}-day adventure in ${trip.destinations.join(" and ")}! Remember to stay flexible and embrace spontaneous discoveries along the way.`;
  }
}
