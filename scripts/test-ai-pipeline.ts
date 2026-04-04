/**
 * End-to-end test for the AI itinerary generation pipeline.
 * Run with: npx tsx scripts/test-ai-pipeline.ts
 *
 * Tests: DBContextTool → ResearchAgent → PlanningAgent → persistItinerary
 * Logs every input/output at each step to docs/ai-pipeline-trace.md
 */

// Load env vars manually since dotenv may not be installed
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
import { createLLMProvider, OPENROUTER_MODELS } from "../src/services/ai/providers";
import { Orchestrator } from "../src/services/ai/orchestrator";
import type { StreamEvent } from "../src/services/ai/types";
import { DBContextTool } from "../src/services/ai/tools/dbContextTool";
import { WebSearchTool } from "../src/services/ai/tools/webSearchTool";
import * as fs from "fs";

const TRIP_ID = "4dba033a-607b-42ba-afeb-a65bcc340b01";

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
function appendJson(label: string, data: unknown) {
  append(`### ${label}`);
  append("```json");
  append(JSON.stringify(data, null, 2));
  append("```");
  append("");
}

async function main() {
  append("# AI Pipeline End-to-End Trace");
  append(`**Date:** ${new Date().toISOString()}`);
  append(`**Trip ID:** ${TRIP_ID}`);
  append("");

  // ── Step 0: Show configured models ──
  append("## Step 0: Configuration");
  appendJson("OpenRouter Models", OPENROUTER_MODELS);
  append(`- OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? "***set***" : "MISSING"}`);
  append(`- SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  append("");

  // ── Step 1: Load trip context (DBContextTool) ──
  append("## Step 1: DBContextTool — Load Trip Context");
  const dbTool = new DBContextTool();
  const ctxStart = Date.now();
  const ctxResult = await dbTool.execute({ tripId: TRIP_ID });
  append(`- Duration: ${Date.now() - ctxStart}ms`);
  append(`- Success: ${ctxResult.success}`);

  if (!ctxResult.success || !ctxResult.data) {
    append(`- **ERROR:** ${ctxResult.error}`);
    writeLog();
    process.exit(1);
  }

  const tripCtx = ctxResult.data;
  appendJson("Trip Details", tripCtx.trip);
  appendJson("Members", tripCtx.members);
  appendJson("Aggregated Dietary", tripCtx.aggregatedDietary);
  append(`- Existing items: ${tripCtx.existingItineraryItems.length}`);
  append(`- Bookings: ${tripCtx.bookings.length}`);
  append(`- Recommendations: ${tripCtx.coTravelerRecommendations.length}`);
  append("");

  // ── Step 2: Test WebSearchTool directly ──
  append("## Step 2: WebSearchTool — Direct Test");
  const searchTool = new WebSearchTool();
  const query = `${tripCtx.trip.destinations[0] || "travel"} travel guide attractions`;
  append(`- Query: "${query}"`);
  append(`- Model: ${OPENROUTER_MODELS.WEB_SEARCH}`);

  const searchStart = Date.now();
  const searchResult = await searchTool.execute({ query });
  append(`- Duration: ${Date.now() - searchStart}ms`);
  append(`- Success: ${searchResult.success}`);
  if (searchResult.error) append(`- Error: ${searchResult.error}`);
  append(`- Results: ${searchResult.data?.results.length ?? 0}`);
  if (searchResult.data?.results.length) {
    appendJson("Search Results (first 3)", searchResult.data.results.slice(0, 3));
  }
  append("");

  // ── Step 3: Full Orchestrator run ──
  append("## Step 3: Full Orchestrator Run");

  // Create job
  const { data: job, error: jobErr } = await supabase
    .from("itinerary_generation_jobs")
    .insert({ trip_id: TRIP_ID, status: "streaming" })
    .select("id")
    .single();

  if (jobErr || !job) {
    append(`- **ERROR creating job:** ${jobErr?.message}`);
    writeLog();
    process.exit(1);
  }

  append(`- Job ID: ${job.id}`);

  // Mark trip as generating
  await supabase
    .from("trips")
    .update({ itinerary_status: "generating", itinerary_generated_at: null })
    .eq("id", TRIP_ID);

  const events: StreamEvent[] = [];
  const emitter = {
    emit(event: StreamEvent) {
      events.push(event);
      // Log each event type inline
      if (event.type === "agent_thought") {
        append(`  [${event.agentName}] ${event.thought}`);
      } else if (event.type === "agent_handoff") {
        append(`  >> Handoff: ${event.fromAgent} → ${event.toAgent} (${event.task})`);
      } else if (event.type === "tool_call") {
        append(`  [tool_call] ${event.toolName}: ${JSON.stringify(event.input)}`);
      } else if (event.type === "tool_result") {
        append(`  [tool_result] ${event.toolName}: success=${event.success} — ${event.summary}`);
      } else if (event.type === "partial_itinerary") {
        append(`  [partial] Day ${event.day.day}: ${event.day.title}`);
      } else if (event.type === "itinerary_complete") {
        append(`  [COMPLETE] ${event.itinerary.days.length} days generated`);
      } else if (event.type === "error") {
        append(`  [ERROR] ${event.message} (recoverable: ${event.recoverable})`);
      } else {
        append(`  [${event.type}] ${JSON.stringify(event)}`);
      }
    },
  };

  const provider = createLLMProvider("ITINERARY_PLANNING");
  const abortController = new AbortController();
  const orchestrator = new Orchestrator(provider, emitter, abortController);

  const orchStart = Date.now();
  try {
    await orchestrator.run(TRIP_ID, job.id);
  } catch (err) {
    append(`\n**Orchestrator threw:** ${err instanceof Error ? err.message : err}`);
  }
  append(`\n- Total Orchestrator Duration: ${Date.now() - orchStart}ms`);
  append(`- Total Events Emitted: ${events.length}`);
  append("");

  // ── Step 4: Verify DB state ──
  append("## Step 4: Verify Database State");

  const { data: updatedTrip } = await supabase
    .from("trips")
    .select("itinerary_status, itinerary_generated_at, ai_itinerary_data")
    .eq("id", TRIP_ID)
    .single();

  append(`- Trip itinerary_status: ${updatedTrip?.itinerary_status}`);
  append(`- Trip itinerary_generated_at: ${updatedTrip?.itinerary_generated_at}`);
  append(`- ai_itinerary_data present: ${!!updatedTrip?.ai_itinerary_data}`);

  const { data: items } = await supabase
    .from("itinerary_items")
    .select("id, day_number, time_slot, title, is_ai_generated")
    .eq("trip_id", TRIP_ID)
    .eq("is_ai_generated", true)
    .order("day_number")
    .order("order_index");

  append(`- Itinerary items in DB: ${items?.length ?? 0}`);
  if (items && items.length > 0) {
    appendJson("Itinerary Items (first 10)", items.slice(0, 10));
  }

  const { data: finalJob } = await supabase
    .from("itinerary_generation_jobs")
    .select("id, status, error_message, completed_at")
    .eq("id", job.id)
    .single();

  appendJson("Final Job State", finalJob);

  // ── Step 5: Event summary ──
  append("## Step 5: All Events Summary");
  const typeCounts: Record<string, number> = {};
  for (const ev of events) {
    typeCounts[ev.type] = (typeCounts[ev.type] || 0) + 1;
  }
  appendJson("Event Type Counts", typeCounts);

  // ── Done ──
  const success = updatedTrip?.itinerary_status === "completed" && (items?.length ?? 0) > 0;
  append("");
  append(`## Result: ${success ? "SUCCESS" : "FAILED"}`);
  if (!success) {
    append("Check errors above for root cause.");
  }

  writeLog();
}

function writeLog() {
  const output = log.join("\n");
  fs.writeFileSync("docs/ai-pipeline-trace.md", output, "utf8");
  console.log("\n\n=== Trace written to docs/ai-pipeline-trace.md ===");
}

main().catch((err) => {
  append(`\n**FATAL:** ${err}`);
  writeLog();
  process.exit(1);
});
