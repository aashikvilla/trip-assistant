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

    // Generate days sequentially to avoid exhausting free-tier rate limits.
    // Free models cap at ~8 RPM — parallel calls across N days immediately hit this limit.
    const generatedDays: ParsedItineraryDay[] = [];
    for (const dayNum of daysToGenerate) {
      if (abortSignal?.aborted) break;
      const day = await this.generateSingleDay(dayNum, systemPrompt, tripContext, researchResults, existingItinerary, reason, abortSignal, emitter);
      generatedDays.push(day);
    }

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
      throw new Error(`Day ${dayNum} generation cancelled (request aborted)`);
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
    let lastRawOutput = "";
    let isGenericContentError = false;
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abortSignal?.aborted) break;

      try {
        const messages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        if (attempt > 0 && lastRawOutput) {
          // Include previous response as assistant turn so the model knows what to fix
          messages.push({ role: "assistant", content: lastRawOutput });
          if (isGenericContentError) {
            messages.push({
              role: "user",
              content: `Your response contained generic placeholder content. ${lastError} Do NOT write vague descriptions like "explore the local area" or "visit a local attraction". Name every venue, restaurant, and neighbourhood explicitly.`,
            });
          } else {
            messages.push({
              role: "user",
              content: `Your response had a formatting issue: ${lastError}. Please rewrite it as valid JSON matching the required schema exactly.`,
            });
          }
        }

        let rawOutput = "";
        for await (const token of this.provider.streamChat(messages, undefined, abortSignal)) {
          rawOutput += token;
        }
        lastRawOutput = rawOutput;

        const cleaned = cleanLLMOutput(rawOutput);
        const parsed = JSON.parse(cleaned) as unknown;
        const validation = ParsedItineraryDaySchema.safeParse(parsed);

        if (validation.success) {
          const candidate = validation.data as ParsedItineraryDay;
          if (this.hasGenericContent(candidate) && attempt < MAX_RETRIES) {
            isGenericContentError = true;
            lastError = `You MUST use the real names of specific places in ${tripContext.trip.destinations.join(", ")} — draw on your training knowledge of the destination.`;
            emitter?.emit({
              type: "agent_thought",
              timestamp: now(),
              agentName: "PlanningAgent",
              thought: `Day ${dayNum}: generic content detected, retrying with correction (attempt ${attempt + 1}/${MAX_RETRIES})...`,
            });
            console.warn("[PlanningAgent]", { dayNum, attempt, warning: "Generic content — retrying" });
          } else {
            parsedDay = candidate;
            if (this.hasGenericContent(candidate)) {
              console.warn("[PlanningAgent]", { dayNum, warning: "Generic content persisted after all retries" });
            }
            console.info("[PlanningAgent]", { dayNum, attempt, durationMs: Date.now() - dayStart });
            break;
          }
        } else {
          isGenericContentError = false;
          lastError = validation.error.message;
          console.warn("[PlanningAgent]", { dayNum, attempt, validationError: lastError });
        }
      } catch (err) {
        isGenericContentError = false;
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.warn("[PlanningAgent]", { dayNum, attempt, error: lastError });
      }
    }

    if (!parsedDay) {
      const errMsg = `Failed to generate Day ${dayNum} after ${MAX_RETRIES + 1} attempts: ${lastError || "unknown error"}`;
      emitter?.emit({
        type: "agent_thought",
        timestamp: now(),
        agentName: "PlanningAgent",
        thought: errMsg,
      });
      console.error("[PlanningAgent]", { dayNum, error: errMsg });
      throw new Error(errMsg);
    }

    // Emit partial itinerary event as each day completes
    emitter?.emit({
      type: "partial_itinerary",
      timestamp: now(),
      day: parsedDay,
    });

    return parsedDay;
  }

  private hasGenericContent(day: ParsedItineraryDay): boolean {
    const genericPhrases = [
      "explore the local area",
      "visit a local attraction",
      "dinner at a local restaurant",
      "lunch at a local restaurant",
      "breakfast at a local",
      "local museum",
      "local market",
      "a local restaurant",
      "the local area",
      "local attraction",
    ];
    const allText = [
      day.morning?.activities?.join(" "),
      day.morning?.breakfast,
      day.afternoon?.activities?.join(" "),
      day.afternoon?.lunch,
      day.evening?.activities?.join(" "),
      day.evening?.dinner,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return genericPhrases.some((phrase) => allText.includes(phrase));
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

    const hasResearchData = researchResults && researchResults.some(r => r.results?.length > 0);

    if (hasResearchData) {
      prompt += "\n\nRESEARCH INSIGHTS:";
      for (const research of researchResults!) {
        if (research.results.length > 0) {
          prompt += `\n${research.destination}:`;
          research.results.slice(0, 5).forEach((r) => {
            prompt += `\n  - ${r.title}: ${r.snippet.slice(0, 150)}`;
          });
        }
      }
    } else {
      prompt += `\n\nNO WEB SEARCH DATA — use your training knowledge of ${trip.destinations.join(", ")} to name REAL, SPECIFIC places. Examples of the specificity required:`;
      prompt += `\n  - Instead of "Visit a local attraction" → "Visit the Burj Khalifa observation deck on the 124th floor"`;
      prompt += `\n  - Instead of "Dinner at a local restaurant" → "Dinner at Nobu Dubai inside Atlantis The Palm"`;
      prompt += `\n  - Instead of "Explore the local area" → "Walk through the Al Fahidi Historical Neighbourhood and Dubai Creek"`;
      prompt += `\n  Adapt these examples to the actual destination and trip preferences.`;
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
- CRITICAL: Every activity must be a REAL, NAMED place or experience — never write "explore the local area", "visit a local attraction", "a local museum", "a local market", or "dinner at a local restaurant"
- Use the actual name of the attraction, restaurant, neighbourhood, or venue
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
