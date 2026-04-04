/**
 * Single Agent Orchestrator
 * ─────────────────────────
 * One LLM call generates the complete itinerary.
 * Controlled by: ITINERARY_AGENT_MODE=single (default: multi)
 *
 * Key improvements over multi-agent:
 * - 1 LLM call instead of 5–10 → doesn't exhaust free-tier rate limits
 * - openrouter/auto picks the best available model automatically
 * - Optional web search plugin for live destination data
 * - Flexible time-based schedule (not locked to morning/afternoon/evening)
 * - Local currency, arrival/departure handling, links/trivia
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import type { StreamEmitter, TripContext, ParsedItinerary, ParsedItineraryDay } from "./types";
import { DBContextTool } from "./tools/dbContextTool";
import { now } from "./utils";
import { cleanLLMOutput } from "./utils";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Prompt Builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: TripContext): string {
  const { trip, members, aggregatedDietary, existingItineraryItems, bookings } = ctx;

  const destination = trip.destinations.join(", ") || "the destination";
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const month = startDate.toLocaleString("en-US", { month: "long" });

  // Aggregate member interests
  const allInterests = [...new Set(members.flatMap(m => m.interests))].filter(Boolean);

  // Budget description
  const budgetDesc = {
    low: "budget-friendly",
    mid: "mid-range",
    high: "premium/luxury",
  }[trip.budget] ?? "mid-range";

  const activityDesc = {
    light: "easy / low-exertion",
    moderate: "moderate effort",
    active: "physically demanding / active",
  }[trip.activityLevel] ?? "moderate";

  // Existing bookings
  const bookingLines = bookings.length > 0
    ? bookings.map(b =>
        `  - ${b.type} via ${b.provider}: ${b.startTime}${b.endTime ? ` → ${b.endTime}` : ""}`
      ).join("\n")
    : "  None";

  // Activities to avoid repeating
  const existingTitles = existingItineraryItems.map(i => i.activityName).filter(Boolean);

  // Must-do items
  const mustDoLines = trip.mustDoActivities.length > 0
    ? trip.mustDoActivities.map(a => `  - ${a}`).join("\n")
    : "  None specified";

  return `You are an expert travel planner. Generate a complete itinerary for the trip below.

DESTINATION: ${destination}
DATES: ${trip.startDate} → ${trip.endDate} (${trip.tripLengthDays} day${trip.tripLengthDays !== 1 ? "s" : ""})
MONTH: ${month}

TRIP STYLE
  Style: ${trip.travelStyle}
  Vibe: ${trip.vibe}
  Budget: ${budgetDesc}
  Activity level: ${activityDesc}
  Group size: ${members.length} traveler${members.length !== 1 ? "s" : ""}
${trip.description ? `  Description: ${trip.description}` : ""}

GROUP INTERESTS (tailor all activities to these)
  ${allInterests.length > 0 ? allInterests.join(", ") : "general sightseeing and local culture"}

DIETARY REQUIREMENTS — every meal recommendation MUST comply
  ${aggregatedDietary.length > 0 ? aggregatedDietary.join(", ") : "no restrictions"}

MUST-DO (include these somewhere in the itinerary)
${mustDoLines}

CONFIRMED BOOKINGS (already arranged — work around these)
${bookingLines}

${existingTitles.length > 0 ? `SKIP THESE (already in itinerary)\n  ${existingTitles.join(", ")}\n` : ""}
PLANNING RULES
1. Use real, specific place names — never "explore the area" or "visit a local attraction"
2. All food/drink must comply with: ${aggregatedDietary.join(", ") || "no restrictions"}
3. First day: start with arrival logistics (e.g. airport pickup, check-in)
4. Last day: end with departure (e.g. checkout, airport transfer)
5. Each day can have ANY number of items — one item if it takes all day, many if the day is packed
6. Use LOCAL CURRENCY throughout all cost estimates (detect currency from destination)
7. Include a currency note at the top: e.g. "Currency: INR (₹). $1 ≈ ₹83"
8. Vary the time of activities based on what makes sense — not forced into 3 fixed slots
9. For meals: name the restaurant + 1–2 specific dishes that comply with the dietary requirements
10. Include links where genuinely useful: Google Maps for locations, Wikipedia/official site for info
11. Add trivia or local context for notable places (1 sentence max)
12. If anything seasonal, weather-related, or event-based is happening in ${month} in ${destination}, mention it
13. Ensure must-do items are naturally woven into the itinerary

OUTPUT: Respond with ONLY valid JSON — no markdown, no text outside the JSON.

{
  "currency": "INR",
  "currency_symbol": "₹",
  "usd_conversion": "1 USD ≈ ₹83",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Arrival & [Theme]",
      "items": [
        {
          "time": "14:00",
          "duration": "1 hour",
          "type": "logistics|food|sightseeing|activity|leisure|departure",
          "title": "Specific place or activity name",
          "description": "1–2 sentences of useful context",
          "location": "Neighbourhood, City",
          "cost": "₹500 per person",
          "links": {
            "maps": "https://maps.google.com/?q=Place+Name+City",
            "info": "https://en.wikipedia.org/wiki/Place"
          },
          "trivia": "One interesting fact (optional, omit if nothing notable)",
          "food_note": "Specific vegan/vegetarian dish recommendation (only for food-type items)"
        }
      ],
      "day_notes": "Practical tip — weather, packing, transport for this day"
    }
  ],
  "tips": [
    "Practical transport tip for ${destination}",
    "Cultural etiquette tip",
    "Payment / money tip"
  ]
}`;
}

// ── Flexible JSON Parser ──────────────────────────────────────────────────────

interface SingleAgentDay {
  day_number?: number;
  date?: string;
  title?: string;
  items?: Array<{
    time?: string;
    duration?: string;
    type?: string;
    title?: string;
    description?: string;
    location?: string;
    cost?: string;
    links?: { maps?: string; info?: string; book?: string };
    trivia?: string;
    food_note?: string;
  }>;
  day_notes?: string;
}

interface SingleAgentOutput {
  currency?: string;
  currency_symbol?: string;
  usd_conversion?: string;
  days?: SingleAgentDay[];
  tips?: string[];
}

function parseSingleAgentOutput(raw: string, ctx: TripContext): ParsedItinerary {
  const cleaned = cleanLLMOutput(raw);

  try {
    const parsed = JSON.parse(cleaned) as SingleAgentOutput;

    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("No 'days' in response");
    }

    const days: ParsedItineraryDay[] = parsed.days.map((d, i) => {
      const items = d.items ?? [];

      // Map items into the legacy morning/afternoon/evening slots by time
      // (the DB schema still uses time_slot, so we preserve this mapping)
      const morning: string[] = [];
      const afternoon: string[] = [];
      const evening: string[] = [];
      let breakfastNote: string | undefined;
      let lunchNote: string | undefined;
      let dinnerNote: string | undefined;

      items.forEach(item => {
        const hour = item.time ? parseInt(item.time.split(":")[0], 10) : 12;
        const label = item.title ?? "";
        const withMeta = item.location
          ? `${label} — ${item.location}${item.trivia ? ` (${item.trivia})` : ""}`
          : label;

        if (item.type === "food") {
          const foodLabel = item.food_note ? `${label} — ${item.food_note}` : label;
          if (hour < 11) breakfastNote = foodLabel;
          else if (hour < 15) lunchNote = foodLabel;
          else dinnerNote = foodLabel;
        } else {
          if (hour < 12) morning.push(withMeta);
          else if (hour < 18) afternoon.push(withMeta);
          else evening.push(withMeta);
        }
      });

      return {
        day: d.day_number ?? i + 1,
        title: d.title ?? `Day ${i + 1} in ${ctx.trip.destinations[0] ?? "your destination"}`,
        morning: { activities: morning, breakfast: breakfastNote },
        afternoon: { activities: afternoon, lunch: lunchNote },
        evening: { activities: evening, dinner: dinnerNote },
      };
    });

    return {
      days,
      closing_note: parsed.tips?.join(" ") ??
        `Enjoy your trip to ${ctx.trip.destinations.join(", ")}!`,
    };
  } catch (err) {
    console.error("[SingleAgent] JSON parse failed:", err, "\nRaw:", raw.slice(0, 400));
    return {
      days: Array.from({ length: ctx.trip.tripLengthDays }, (_, i) => ({
        day: i + 1,
        title: `Day ${i + 1} in ${ctx.trip.destinations[0] ?? "your destination"}`,
        morning: { activities: ["Explore the local area"] },
        afternoon: { activities: ["Visit a local attraction"] },
        evening: { activities: ["Dinner at a local restaurant"] },
      })),
      closing_note: "Enjoy your trip!",
    };
  }
}

// ── DB Persistence (stores flexible items using time as time_slot) ────────────

async function persistItinerary(
  tripId: string,
  jobId: string,
  rawOutput: string,
  parsedItinerary: ParsedItinerary,
  createdBy: string,
  supabase: ReturnType<typeof getServiceClient>,
): Promise<void> {
  await supabase
    .from("itinerary_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("is_ai_generated", true);

  const aiUserId = process.env.AI_SYSTEM_USER_ID ?? createdBy;
  const items: TablesInsert<"itinerary_items">[] = [];

  // Try to use the rich structured output directly if available
  let richDays: SingleAgentDay[] = [];
  try {
    const cleaned = cleanLLMOutput(rawOutput);
    const parsed = JSON.parse(cleaned) as SingleAgentOutput;
    richDays = parsed.days ?? [];
  } catch { /* fall back to parsedItinerary */ }

  if (richDays.length > 0) {
    // Persist using the rich flexible format — map all LLM fields to DB columns
    for (const day of richDays) {
      (day.items ?? []).forEach((item, idx) => {
        // Parse "1.5 hours" / "45 minutes" → integer minutes
        let durationMinutes: number | null = null;
        if (item.duration) {
          const hourMatch = item.duration.match(/([\d.]+)\s*h/i);
          const minMatch = item.duration.match(/([\d.]+)\s*m/i);
          durationMinutes = Math.round(
            (hourMatch ? parseFloat(hourMatch[1]) * 60 : 0) +
            (minMatch ? parseFloat(minMatch[1]) : 0)
          ) || null;
        }

        items.push({
          trip_id: tripId,
          created_by: aiUserId,
          type: "activity",                          // itinerary_items.type enum
          activity_type: item.type ?? "activity",    // flexible type text field
          title: item.title ?? "Activity",
          activity_description: item.description ?? item.title ?? "",
          food_suggestion: item.food_note ?? null,
          trivia: item.trivia ?? null,
          cost_estimate: item.cost ?? null,
          location_name: item.location ?? null,
          external_link: item.links?.info ?? null,
          maps_link: item.links?.maps ?? null,
          duration_minutes: durationMinutes,
          time_slot: item.time ?? (idx < 3 ? "morning" : idx < 6 ? "afternoon" : "evening"),
          day_number: day.day_number ?? 1,
          order_index: idx,
          is_ai_generated: true,
          all_day: false,
        } as TablesInsert<"itinerary_items">);
      });
    }
  } else {
    // Fallback: use parsed morning/afternoon/evening structure
    for (const day of parsedItinerary.days) {
      let orderIndex = 0;
      const addItems = (slot: string, activities?: string[], meal?: string) => {
        for (const activity of activities ?? []) {
          items.push({
            trip_id: tripId, created_by: aiUserId, type: "activity",
            title: activity, activity_description: activity,
            time_slot: slot, day_number: day.day, order_index: orderIndex++,
            is_ai_generated: true, all_day: false,
          });
        }
        if (meal) {
          items.push({
            trip_id: tripId, created_by: aiUserId, type: "activity",
            title: meal, activity_description: meal, food_suggestion: meal,
            time_slot: slot, day_number: day.day, order_index: orderIndex++,
            is_ai_generated: true, all_day: false,
          });
        }
      };
      addItems("morning", day.morning?.activities, day.morning?.breakfast);
      addItems("afternoon", day.afternoon?.activities, day.afternoon?.lunch);
      addItems("evening", day.evening?.activities, day.evening?.dinner);
    }
  }

  if (items.length > 0) {
    const { error } = await supabase.from("itinerary_items").insert(items);
    if (error) throw new Error(`DB insert failed: ${error.message}`);
  }

  await supabase.from("trips").update({
    ai_itinerary_data: parsedItinerary as unknown as Json,
    itinerary_status: "completed",
    itinerary_generated_at: new Date().toISOString(),
  }).eq("id", tripId);

  await supabase.from("itinerary_generation_jobs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
  }).eq("id", jobId);

  console.info("[SingleAgent] Persisted", { tripId, jobId, items: items.length });
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export class SingleAgentOrchestrator {
  private dbContextTool = new DBContextTool();

  constructor(
    private emitter: StreamEmitter,
    private abortController: AbortController,
  ) {}

  async run(tripId: string, jobId: string): Promise<void> {
    const supabase = getServiceClient();
    const { signal } = this.abortController;
    const runStart = Date.now();

    const watchdogTimer = setTimeout(async () => {
      await supabase.from("itinerary_generation_jobs").update({
        status: "failed",
        error_message: "Timeout after 5 minutes",
        completed_at: new Date().toISOString(),
      }).eq("id", jobId).eq("status", "streaming");
      this.abortController.abort();
    }, 300_000);

    try {
      // 1. Load context
      this.think("Loading trip context...");
      const ctxResult = await this.dbContextTool.execute({ tripId }, signal);
      if (!ctxResult.success || !ctxResult.data) {
        throw new Error(ctxResult.error ?? "Failed to load trip context");
      }
      const ctx = ctxResult.data;

      console.info("[SingleAgent] Context loaded", {
        tripId,
        destination: ctx.trip.destinations,
        days: ctx.trip.tripLengthDays,
        members: ctx.members.length,
        dietary: ctx.aggregatedDietary,
        interests: [...new Set(ctx.members.flatMap(m => m.interests))],
        mustDo: ctx.trip.mustDoActivities,
        budget: ctx.trip.budget,
        vibe: ctx.trip.vibe,
        activityLevel: ctx.trip.activityLevel,
      });

      // 2. Build prompt
      const dest = ctx.trip.destinations.join(", ");
      this.think(`Crafting personalised itinerary for ${dest}...`);
      const prompt = buildPrompt(ctx);

      // 3. Call LLM
      this.think("Generating complete itinerary with web search...");
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

      const model = process.env.SINGLE_AGENT_MODEL ?? "openrouter/auto";
      const useWebSearch = process.env.SINGLE_AGENT_WEB_SEARCH !== "false";

      console.info("[SingleAgent] LLM call", { model, useWebSearch, promptLength: prompt.length });

      const body: Record<string, unknown> = {
        model,
        messages: [
          {
            role: "system",
            content: "You are an expert travel planner. Always respond with valid JSON only — no markdown fences, no text outside the JSON.",
          },
          { role: "user", content: prompt },
        ],
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      };

      if (useWebSearch) {
        body.plugins = [{ id: "web", max_results: 5 }];
      }

      const llmStart = Date.now();
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Vibe Trip",
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter ${response.status}: ${errText.slice(0, 300)}`);
      }

      // Stream and collect output
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let rawOutput = "";
      let buffer = "";
      let tokenCount = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const line of parts) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]" || !trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6)) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = json.choices?.[0]?.delta?.content;
              if (token) { rawOutput += token; tokenCount++; }
            } catch { /* skip */ }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const llmMs = Date.now() - llmStart;
      console.info("[SingleAgent] LLM complete", {
        model, durationMs: llmMs, outputLength: rawOutput.length, tokenCount,
        preview: rawOutput.slice(0, 300),
      });

      // 4. Parse
      this.think("Parsing and saving itinerary...");
      const itinerary = parseSingleAgentOutput(rawOutput, ctx);

      if (itinerary.days.length === 0) {
        throw new Error("No itinerary days were generated");
      }

      // Emit partial events for streaming UI
      for (const day of itinerary.days) {
        this.emitter.emit({ type: "partial_itinerary", timestamp: now(), day });
      }

      // 5. Persist
      await persistItinerary(tripId, jobId, rawOutput, itinerary, ctx.trip.createdBy, supabase);

      // 6. Complete
      this.emitter.emit({ type: "itinerary_complete", timestamp: now(), itinerary });

      console.info("[SingleAgent] Done", {
        tripId, jobId, days: itinerary.days.length,
        totalMs: Date.now() - runStart,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.emitter.emit({ type: "error", timestamp: now(), message, recoverable: false });
      console.error("[SingleAgent] Error", { jobId, message });

      await supabase.from("itinerary_generation_jobs").update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

      await supabase.from("trips").update({
        itinerary_status: "failed",
        itinerary_generated_at: new Date().toISOString(),
      }).eq("id", tripId);
    } finally {
      clearTimeout(watchdogTimer);
    }
  }

  private think(thought: string) {
    this.emitter.emit({ type: "agent_thought", timestamp: now(), agentName: "Planner", thought });
  }
}
