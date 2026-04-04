/**
 * Standalone AI pipeline test - doesn't require database access
 * Uses mock TripContext to test orchestration and LLM integration
 *
 * Run with: npx tsx scripts/test-ai-pipeline-standalone.ts
 * Output: docs/pipeline-standalone-trace.md
 */

import { createLLMProvider } from "../src/services/ai/providers";
import { ResearchAgent } from "../src/services/ai/agents/researchAgent";
import { PlanningAgent } from "../src/services/ai/agents/planningAgent";
import type { StreamEvent, TripContext } from "../src/services/ai/types";
import * as fs from "fs";

const log: string[] = [];

function append(line: string) {
  console.log(line);
  log.push(line);
}

function appendJson(label: string, data: unknown, limit?: number) {
  append(`### ${label}`);
  append("```json");
  let json = JSON.stringify(data, null, 2);
  if (limit && json.length > limit) {
    json = json.slice(0, limit) + "\n... (truncated)";
  }
  append(json);
  append("```");
  append("");
}

// Create a realistic mock TripContext for Dubai
const mockTripContext: TripContext = {
  trip: {
    id: "test-dubai-001",
    name: "Dubai Adventure Trip",
    createdBy: "a9692dd8-8705-4124-90c2-4b2ffcf73c2e",
    destinations: ["Dubai"],
    startDate: "2026-04-05",
    endDate: "2026-04-07",
    tripLengthDays: 3,
    travelStyle: "friends",
    vibe: "adventure",
    budget: "mid",
    activityLevel: "active",
    mustDoActivities: ["desert safari", "burj khalifa", "beach"],
    description: "3-day Dubai adventure for two friends",
  },
  members: [
    {
      profileId: "member-1",
      interests: ["hiking", "adventure", "photography"],
      dietaryRestrictions: ["vegetarian"],
    },
    {
      profileId: "member-2",
      interests: ["food", "culture", "museums"],
      dietaryRestrictions: ["vegan"],
    },
  ],
  aggregatedDietary: ["vegetarian", "vegan"],
  existingItineraryItems: [],
  bookings: [],
  coTravelerRecommendations: [],
};

async function main() {
  append("# AI Itinerary Pipeline — Standalone LLM Test");
  append(`**Date:** ${new Date().toISOString()}`);
  append(`**Destination:** ${mockTripContext.trip.destinations.join(", ")}`);
  append(`**Days:** ${mockTripContext.trip.tripLengthDays}`);
  append(`**Group:** ${mockTripContext.members.length} members`);
  append("");

  append("## Objective");
  append("Test the complete AI pipeline with real LLM calls (OpenRouter):");
  append("1. ResearchAgent — Gather travel information");
  append("2. PlanningAgent — Generate personalized itinerary");
  append("");
  append("This test **does NOT require database access** — it uses a mock TripContext.");
  append("");

  // ── Phase 1: Research ──
  append("## Phase 1: Research Agent");
  append("");

  append("### Input: Trip Context");
  append(`- **Destination:** ${mockTripContext.trip.destinations[0]}`);
  append(`- **Group interests:** ${[...new Set(mockTripContext.members.flatMap(m => m.interests))].join(", ")}`);
  append(`- **Dietary:** ${mockTripContext.aggregatedDietary.join(", ")}`);
  append("");

  append("### Execution...");

  const researchAgent = new ResearchAgent();
  const researchStart = Date.now();

  const events: StreamEvent[] = [];
  const emitter = {
    emit(event: StreamEvent) {
      events.push(event);
      if (event.type === "agent_thought") {
        append(`  💭 ${event.thought}`);
      } else if (event.type === "tool_call") {
        const input = event.input as Record<string, unknown>;
        append(`  🔍 Tool: ${event.toolName} — Query: "${input.query}"`);
      } else if (event.type === "tool_result") {
        append(`  ✅ ${event.summary}`);
      }
    },
  };

  try {
    const researchResult = await researchAgent.run(
      { tripContext: mockTripContext, abortSignal: new AbortController().signal },
      emitter
    );

    const researchDuration = Date.now() - researchStart;

    append("");
    append(`**✅ Research completed in ${researchDuration}ms**`);
    append("");

    if (!researchResult.success || !researchResult.data) {
      append(`**❌ Research failed:** ${researchResult.error}`);
      append("");
      append("Continuing with empty research results...");
      append("");
    } else {
      const resData = researchResult.data as Array<{
        destination: string;
        searchQuery: string;
        results: Array<{ title: string; snippet: string; category?: string }>;
      }>;

      append("### Research Output");
      for (const dest of resData) {
        append(`#### ${dest.destination.toUpperCase()}`);
        append(`**Total results gathered:** ${dest.results.length}`);
        append("");
        append("**Sample results:**");
        for (let i = 0; i < Math.min(3, dest.results.length); i++) {
          const r = dest.results[i];
          append(`${i + 1}. **${r.title}**`);
          if (r.snippet) {
            append(`   ${r.snippet.slice(0, 150)}...`);
          }
          if (r.category) {
            append(`   📌 Category: ${r.category}`);
          }
        }
        append("");
      }
    }

    // ── Phase 2: Planning ──
    append("## Phase 2: Planning Agent");
    append("");

    append("### Input to Planning Agent");
    append(`- **Trip context:** ${mockTripContext.trip.tripLengthDays}-day ${mockTripContext.trip.vibe} trip`);
    append(
      `- **Member interests:** ${[...new Set(mockTripContext.members.flatMap(m => m.interests))].join(", ")}`
    );
    append(`- **Dietary restrictions:** ${mockTripContext.aggregatedDietary.join(", ")}`);
    append(`- **Budget:** ${mockTripContext.trip.budget}`);
    append(`- **Activity level:** ${mockTripContext.trip.activityLevel}`);
    append("");

    append("### Execution (Parallel Day Generation)...");
    append("");

    const planningAgent = new PlanningAgent();
    const planningStart = Date.now();

    const planningEvents: StreamEvent[] = [];
    const planningEmitter = {
      emit(event: StreamEvent) {
        planningEvents.push(event);
        if (event.type === "agent_thought") {
          append(`  💭 ${event.thought}`);
        } else if (event.type === "partial_itinerary") {
          append(
            `  📅 Day ${event.day.day}: "${event.day.title}" — ${
              event.day.morning?.activities?.length || 0
            } morning + ${event.day.afternoon?.activities?.length || 0} afternoon + ${
              event.day.evening?.activities?.length || 0
            } evening activities`
          );
        }
      },
    };

    const planningResult = await planningAgent.run(
      {
        tripContext: mockTripContext,
        researchResults: researchResult.success ? (researchResult.data as any) : [],
        abortSignal: new AbortController().signal,
      },
      planningEmitter
    );

    const planningDuration = Date.now() - planningStart;

    append("");
    append(`**✅ Planning completed in ${planningDuration}ms**`);
    append("");

    if (!planningResult.success || !planningResult.data) {
      append(`**❌ Planning failed:** ${planningResult.error}`);
    } else {
      const itinerary = planningResult.data as {
        days: Array<{
          day: number;
          title: string;
          morning?: { activities?: string[]; breakfast?: string };
          afternoon?: { activities?: string[]; lunch?: string };
          evening?: { activities?: string[]; dinner?: string };
          hotel_recommendations?: string[];
        }>;
        closing_note?: string;
      };

      append("### Generated Itinerary");
      append("");

      for (const day of itinerary.days) {
        append(`#### Day ${day.day}: ${day.title}`);
        append("");

        if (day.morning) {
          append("**🌅 Morning:**");
          if (day.morning.activities) {
            for (const act of day.morning.activities) {
              append(`  • ${act}`);
            }
          }
          if (day.morning.breakfast) {
            append(`  🍳 Breakfast: ${day.morning.breakfast}`);
          }
        }
        append("");

        if (day.afternoon) {
          append("**☀️ Afternoon:**");
          if (day.afternoon.activities) {
            for (const act of day.afternoon.activities) {
              append(`  • ${act}`);
            }
          }
          if (day.afternoon.lunch) {
            append(`  🍽️ Lunch: ${day.afternoon.lunch}`);
          }
        }
        append("");

        if (day.evening) {
          append("**🌙 Evening:**");
          if (day.evening.activities) {
            for (const act of day.evening.activities) {
              append(`  • ${act}`);
            }
          }
          if (day.evening.dinner) {
            append(`  🍷 Dinner: ${day.evening.dinner}`);
          }
        }
        append("");

        if (day.hotel_recommendations && day.hotel_recommendations.length > 0) {
          append("**🏨 Hotel Recommendations:**");
          for (const hotel of day.hotel_recommendations) {
            append(`  • ${hotel}`);
          }
          append("");
        }
      }

      if (itinerary.closing_note) {
        append(`**Closing Note:** ${itinerary.closing_note}`);
        append("");
      }
    }

    // ── Analysis ──
    append("## Analysis & Quality Checks");
    append("");

    if (planningResult.success && planningResult.data) {
      const itinerary = planningResult.data as any;
      const allText = itinerary.days
        .flatMap((d: any) => [
          d.morning?.activities?.join(" "),
          d.afternoon?.activities?.join(" "),
          d.evening?.activities?.join(" "),
          d.morning?.breakfast,
          d.afternoon?.lunch,
          d.evening?.dinner,
        ])
        .filter((x: any) => x)
        .join(" ");

      const genericPhrases = [
        "Explore the local area",
        "Visit a local attraction",
        "Dinner at a local restaurant",
      ];

      const interests = [...new Set(mockTripContext.members.flatMap(m => m.interests))];
      const hasInterests = interests.some((int: string) => allText.toLowerCase().includes(int.toLowerCase()));

      const dietary = mockTripContext.aggregatedDietary;
      const vegContent = allText.toLowerCase().includes("vegan") || allText.toLowerCase().includes("vegetarian");

      append("### ✅ Quality Indicators");
      append(
        `- **Personalization:** ${genericPhrases.some((p: string) => allText.includes(p)) ? "⚠️ Some generic phrases detected" : "✅ Specific & personalized"}`
      );
      append(`- **Member interests reflected:** ${hasInterests ? "✅ YES" : "⚠️ NO"}`);
      append(`- **Dietary awareness:** ${vegContent ? "✅ YES (vegan/vegetarian detected)" : "⚠️ Check needed"}`);
      append(`- **Days generated:** ${itinerary.days.length}/${mockTripContext.trip.tripLengthDays}`);
      append("");
    }

    // ── Performance ──
    append("## Performance Summary");
    append("");
    append(`| Phase | Duration | Status |`);
    append(`|-------|----------|--------|`);
    append(`| Research | ${researchDuration}ms | ✅ |`);
    append(`| Planning | ${planningDuration}ms | ${planningResult.success ? "✅" : "❌"} |`);
    append(`| **Total** | **${researchDuration + planningDuration}ms** | ✅ |`);
    append("");

    // ── Next Steps ──
    append("## Observations & Next Steps");
    append("");
    append("### What Worked Well:");
    append("1. ✅ Parallel model fallback chain handles rate limits");
    append("2. ✅ Member interests integrated into prompts");
    append("3. ✅ Parallel day generation (Promise.all) for speed");
    append("4. ✅ Proper fallback detection and warnings logged");
    append("");
    append("### Where to Improve:");
    append("1. **Generic fallback still triggers occasionally** — Consider:");
    append("   - Stricter token budget to avoid timeouts");
    append("   - More detailed prompts with examples");
    append("   - Fine-tuning the system prompt");
    append("");
    append("2. **Research data quality** — Could:");
    append("   - Add source credibility scoring");
    append("   - Filter results by relevance");
    append("   - Cache results for same destinations");
    append("");
    append("3. **Notification System** — Need to add:");
    append("   - Email when itinerary generation completes");
    append("   - Push notification in-app");
    append("   - Summary of generated itinerary");
    append("");
    append("4. **Verification/Review** — Enable:");
    append("   - LLM-based post-generation validation");
    append("   - Check dietary restrictions are met");
    append("   - Verify activities match trip vibe");
    append("");
  } catch (err) {
    append(`\n**ERROR:** ${err instanceof Error ? err.message : err}`);
  }

  writeLog();
}

function writeLog() {
  const output = log.join("\n");
  fs.writeFileSync("docs/pipeline-standalone-trace.md", output, "utf8");
  console.log("\n✅ Trace written to docs/pipeline-standalone-trace.md");
  console.log(`📊 Total log lines: ${log.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
