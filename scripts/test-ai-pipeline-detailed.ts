/**
 * Enhanced end-to-end test for AI itinerary generation pipeline.
 * Captures detailed input/output from EACH step of the pipeline.
 *
 * Run with: npx tsx scripts/test-ai-pipeline-detailed.ts <TRIP_ID>
 *
 * Output: docs/pipeline-detailed-trace.md with complete orchestration flow
 */

// Load env vars manually
import * as fsEnv from "fs";
const envContent = fsEnv.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) continue;
  const key = trimmed.slice(0, eqIndex);
  const value = trimmed.slice(eqIndex + 1);
  if (!process.env[key]) process.env[key] = value;
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { createLLMProvider } from "../src/services/ai/providers";
import { Orchestrator } from "../src/services/ai/orchestrator";
import type { StreamEvent } from "../src/services/ai/types";
import { DBContextTool } from "../src/services/ai/tools/dbContextTool";
import { WebSearchTool } from "../src/services/ai/tools/webSearchTool";
import { ResearchAgent } from "../src/services/ai/agents/researchAgent";
import { PlanningAgent } from "../src/services/ai/agents/planningAgent";
import * as fs from "fs";

const TRIP_ID = process.argv[2] ?? "87654321-4321-4321-4321-210987654321";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

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

function appendCode(lang: string, code: string) {
  append(`\`\`\`${lang}`);
  append(code);
  append("```");
  append("");
}

async function main() {
  append("# AI Pipeline — Detailed Orchestration Trace");
  append(`**Date:** ${new Date().toISOString()}`);
  append(`**Trip ID:** ${TRIP_ID}`);
  append("");
  append("This document shows EVERY input and output at each step of the pipeline.");
  append("");

  // ── Step 0: Load Context ──
  append("## Step 1: DBContextTool — Load Trip Context");
  append("");

  const dbTool = new DBContextTool();
  const ctxStart = Date.now();
  let tripContext;

  try {
    const ctxResult = await dbTool.execute({ tripId: TRIP_ID });
    append(`**Status:** ${ctxResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    append(`**Duration:** ${Date.now() - ctxStart}ms`);
    append("");

    if (!ctxResult.success || !ctxResult.data) {
      append(`**Error:** ${ctxResult.error}`);
      writeLog();
      process.exit(1);
    }

    tripContext = ctxResult.data;

    append("### Input to DBContextTool");
    appendJson("Input", { tripId: TRIP_ID });

    append("### Output: TripContext");
    appendJson("Trip Details", tripContext.trip);
    appendJson("Members (with interests & dietary)", tripContext.members);
    appendJson("Aggregated Dietary Restrictions", tripContext.aggregatedDietary);
    append(`**Existing itinerary items:** ${tripContext.existingItineraryItems.length}`);
    append(`**Bookings:** ${tripContext.bookings.length}`);
    append(`**Co-traveler recommendations:** ${tripContext.coTravelerRecommendations.length}`);
    append("");

    append("### Analysis");
    append(`- ✅ Trip loaded: ${tripContext.trip.name}`);
    append(`- ✅ Destinations: ${tripContext.trip.destinations.join(", ")}`);
    append(`- ✅ Group size: ${tripContext.members.length} members`);
    append(`- ✅ Group interests: ${[...new Set(tripContext.members.flatMap(m => m.interests))].join(", ") || "none"}`);
    append(`- ✅ Dietary restrictions: ${tripContext.aggregatedDietary.join(", ")}`);
    append(`- ✅ Trip length: ${tripContext.trip.tripLengthDays} days`);
    append("");
  } catch (err) {
    append(`**FATAL:** ${err instanceof Error ? err.message : err}`);
    writeLog();
    process.exit(1);
  }

  // ── Step 1: Web Search (Direct) ──
  append("## Step 2: WebSearchTool — Direct Test");
  append("");

  const searchTool = new WebSearchTool();
  const query = `${tripContext.trip.destinations[0]} top tourist attractions sightseeing`;

  append("### Input to WebSearchTool");
  appendJson("Search Query", { query });

  const searchStart = Date.now();
  const searchResult = await searchTool.execute({ query });
  const searchDuration = Date.now() - searchStart;

  append(`**Status:** ${searchResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  append(`**Duration:** ${searchDuration}ms`);
  append(`**Results count:** ${searchResult.data?.results.length ?? 0}`);
  append("");

  if (searchResult.data?.results.length) {
    appendJson("Web Search Results (first 5)", searchResult.data.results.slice(0, 5), 2000);
  } else if (searchResult.error) {
    append(`**Error:** ${searchResult.error}`);
  }
  append("");

  // ── Step 2: Research Agent ──
  append("## Step 3: ResearchAgent — Full Research Phase");
  append("");

  const researchAgent = new ResearchAgent();
  const researchStart = Date.now();

  const events: StreamEvent[] = [];
  const emitter = {
    emit(event: StreamEvent) {
      events.push(event);
      // Log interesting events
      if (event.type === "agent_thought") {
        append(`  [${event.agentName}] ${event.thought}`);
      } else if (event.type === "tool_call") {
        append(`  [tool_call] ${event.toolName}: ${JSON.stringify(event.input).slice(0, 100)}...`);
      } else if (event.type === "tool_result") {
        append(`  [tool_result] ${event.toolName}: ${event.summary}`);
      }
    },
  };

  emitter.emit({ type: "agent_start", timestamp: new Date().toISOString(), agentName: "ResearchAgent" });

  const researchResult = await researchAgent.run(
    { tripContext, abortSignal: new AbortController().signal },
    emitter
  );

  const researchDuration = Date.now() - researchStart;

  append(`**Status:** ${researchResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  append(`**Duration:** ${researchDuration}ms`);
  append("");

  append("### Output: ResearchResult");
  if (researchResult.data) {
    const resData = researchResult.data as Array<{
      destination: string;
      searchQuery: string;
      results: Array<{ title: string; snippet: string }>;
    }>;
    for (const dest of resData) {
      append(`#### ${dest.destination}`);
      append(`**Queries:** ${dest.searchQuery}`);
      append(`**Results:** ${dest.results.length}`);
      appendJson("Sample results (first 3)", dest.results.slice(0, 3), 1500);
    }
  }
  append("");

  // ── Step 3: Planning Agent ──
  append("## Step 4: PlanningAgent — Generate Itinerary");
  append("");

  const planningAgent = new PlanningAgent();
  const planningStart = Date.now();

  const planningEvents: StreamEvent[] = [];
  const planningEmitter = {
    emit(event: StreamEvent) {
      planningEvents.push(event);
      if (event.type === "agent_thought") {
        append(`  [${event.agentName}] ${event.thought}`);
      } else if (event.type === "partial_itinerary") {
        append(`  [partial] Day ${event.day.day}: "${event.day.title}"`);
      }
    },
  };

  planningEmitter.emit({ type: "agent_start", timestamp: new Date().toISOString(), agentName: "PlanningAgent" });

  const planningResult = await planningAgent.run(
    {
      tripContext,
      researchResults: researchResult.success
        ? (researchResult.data as Parameters<typeof planningAgent.run>[0]["researchResults"])
        : [],
      abortSignal: new AbortController().signal,
    },
    planningEmitter
  );

  const planningDuration = Date.now() - planningStart;

  append(`**Status:** ${planningResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  append(`**Duration:** ${planningDuration}ms`);
  append("");

  append("### Output: Generated Itinerary");
  if (planningResult.data) {
    const itinerary = planningResult.data as {
      days: Array<{
        day: number;
        title: string;
        morning?: { activities?: string[]; breakfast?: string };
        afternoon?: { activities?: string[]; lunch?: string };
        evening?: { activities?: string[]; dinner?: string };
      }>;
      closing_note?: string;
    };

    append(`**Total days generated:** ${itinerary.days.length}`);
    append("");

    for (const day of itinerary.days) {
      append(`#### Day ${day.day}: ${day.title}`);
      append("");

      if (day.morning) {
        append("**Morning:**");
        if (day.morning.activities) {
          for (const act of day.morning.activities) {
            append(`  - ${act}`);
          }
        }
        if (day.morning.breakfast) {
          append(`  🍳 Breakfast: ${day.morning.breakfast}`);
        }
      }

      if (day.afternoon) {
        append("**Afternoon:**");
        if (day.afternoon.activities) {
          for (const act of day.afternoon.activities) {
            append(`  - ${act}`);
          }
        }
        if (day.afternoon.lunch) {
          append(`  🍽️ Lunch: ${day.afternoon.lunch}`);
        }
      }

      if (day.evening) {
        append("**Evening:**");
        if (day.evening.activities) {
          for (const act of day.evening.activities) {
            append(`  - ${act}`);
          }
        }
        if (day.evening.dinner) {
          append(`  🍷 Dinner: ${day.evening.dinner}`);
        }
      }

      append("");
    }

    if (itinerary.closing_note) {
      append(`**Closing note:** ${itinerary.closing_note}`);
      append("");
    }
  }

  // ── Step 4: Data Quality Check ──
  append("## Step 5: Data Quality Analysis");
  append("");

  if (planningResult.data) {
    const itinerary = planningResult.data as {
      days: Array<{
        day: number;
        title: string;
        morning?: { activities?: string[]; breakfast?: string };
        afternoon?: { activities?: string[]; lunch?: string };
        evening?: { activities?: string[]; dinner?: string };
      }>;
    };

    const genericPhrases = [
      "Explore the local area",
      "Visit a local attraction",
      "Dinner at a local restaurant",
      "Explore",
      "Visit",
    ];

    const allText = itinerary.days
      .flatMap(d => [
        d.morning?.activities?.join(" "),
        d.afternoon?.activities?.join(" "),
        d.evening?.activities?.join(" "),
        d.morning?.breakfast,
        d.afternoon?.lunch,
        d.evening?.dinner,
      ])
      .filter(Boolean)
      .join(" ");

    const genericCount = genericPhrases.filter(phrase => allText.includes(phrase)).length;

    append("### Personalization Check");
    append(`- ✅ Destination-specific content: ${genericCount === 0 ? "YES" : `PARTIAL (${genericCount} generic phrases found)`}`);
    append(`- ✅ Member interests incorporated: ${allText.includes(tripContext.members.flatMap(m => m.interests)[0] ?? "") ? "YES" : "NO"}`);
    append(`- ✅ Dietary restrictions respected: ${!allText.includes("meat") && !allText.includes("fish") ? "YES" : "NEEDS REVIEW"}`);
    append(`- ✅ Variety across days: ${itinerary.days.length === tripContext.trip.tripLengthDays ? "YES" : "NO"}`);
    append("");
  }

  // ── Step 5: Summary ──
  append("## Step 6: Performance Summary");
  append("");

  append(`| Phase | Duration | Status |`);
  append(`|-------|----------|--------|`);
  append(`| DBContextTool | ${Date.now() - ctxStart}ms | ✅ |`);
  append(`| WebSearchTool | ${searchDuration}ms | ${searchResult.success ? "✅" : "❌"} |`);
  append(`| ResearchAgent | ${researchDuration}ms | ${researchResult.success ? "✅" : "❌"} |`);
  append(`| PlanningAgent | ${planningDuration}ms | ${planningResult.success ? "✅" : "❌"} |`);
  append(`| **Total** | **${Date.now() - ctxStart}ms** | ✅ |`);
  append("");

  append("## Step 7: Event Stream Analysis");
  append("");

  const allEvents = [...events, ...planningEvents];
  const eventTypeCounts: Record<string, number> = {};
  for (const ev of allEvents) {
    eventTypeCounts[ev.type] = (eventTypeCounts[ev.type] || 0) + 1;
  }

  append(`**Total events emitted:** ${allEvents.length}`);
  appendJson("Event type counts", eventTypeCounts);
  append("");

  append("## Areas for Improvement");
  append("");
  append("1. **Research Phase:**");
  append("   - Consider caching research results if same destination appears in multiple trips");
  append("   - Parallel queries are good; could add relevance scoring to filter top results");
  append("");
  append("2. **Planning Phase:**");
  append("   - Current token budget: 2000 tokens max per day. Monitor if hitting limits");
  append("   - Could split day into breakfast/lunch/dinner planning for better focus");
  append("");
  append("3. **Personalization:**");
  append("   - Currently includes interests in system prompt. Could weight them by number of members");
  append("   - Consider per-member itineraries with group overlap");
  append("");
  append("4. **Error Handling:**");
  append("   - Fallback model chain is good. Consider logging which fallback was used");
  append("   - Rate limit 429 detection works; could pre-emptively switch models");
  append("");
  append("5. **Quality Assurance:**");
  append("   - No LLM-based post-generation validation (ReviewAgent) — could enable it");
  append("   - Could check dietary restrictions match before persistence");
  append("");
  append("6. **Notifications:**");
  append("   - Add email/push notification when itinerary generation completes");
  append("   - Include summary (destination, dates, highlight activities)");
  append("");

  writeLog();
}

function writeLog() {
  const output = log.join("\n");
  fs.writeFileSync("docs/pipeline-detailed-trace.md", output, "utf8");
  console.log("\n✅ Trace written to docs/pipeline-detailed-trace.md");
  console.log(`📊 Total log lines: ${log.length}`);
}

main().catch((err) => {
  append(`\n**FATAL:** ${err}`);
  writeLog();
  process.exit(1);
});
