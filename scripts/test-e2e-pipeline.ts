/**
 * Full End-to-End AI Itinerary Pipeline Test
 * ============================================
 * Tests the complete flow: DB context → Research → Planning → Persist → Verify
 * Logs every LLM call: model, input (truncated), raw output, timing, success/fail
 *
 * Usage:
 *   npx tsx scripts/test-e2e-pipeline.ts <TRIP_ID>
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

// ─── Tracer ───────────────────────────────────────────────────────────────────
const lines: string[] = [];
const traceFile = path.join("docs", "e2e-pipeline-trace.md");

function log(section: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${section}] ${msg}${data !== undefined ? "\n  " + JSON.stringify(data, null, 2).slice(0, 600) : ""}`;
  console.log(line);
  lines.push(line);
}

function logSep(title: string) {
  const sep = `\n${"═".repeat(70)}\n  ${title}\n${"═".repeat(70)}`;
  console.log(sep);
  lines.push(sep);
}

function saveTrace() {
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync(traceFile, lines.join("\n"), "utf8");
  console.log(`\n📄 Trace saved to ${traceFile}`);
}

// ─── Instrumented LLM Provider ────────────────────────────────────────────────
interface LLMMessage { role: string; content: string }

async function callOpenRouter(
  model: string,
  messages: LLMMessage[],
  signal?: AbortSignal,
): Promise<{ output: string; durationMs: number; status: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const sysMsg = messages.find(m => m.role === "system");
  const userMsg = messages.find(m => m.role === "user");
  log("LLM_CALL", `→ ${model}`, {
    systemLength: sysMsg?.content.length ?? 0,
    userLength: userMsg?.content.length ?? 0,
    systemPreview: sysMsg?.content.slice(0, 200),
    userPreview: userMsg?.content.slice(0, 200),
  });

  const start = Date.now();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Vibe Trip E2E Test",
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    }),
    signal,
  });

  const durationMs = Date.now() - start;
  log("LLM_CALL", `← ${model} [status=${response.status}] [${durationMs}ms]`);

  if (!response.ok) {
    const err = await response.text();
    log("LLM_CALL", `✗ ${model} error`, { status: response.status, body: err.slice(0, 300) });
    throw new Error(`OpenRouter ${response.status}: ${err.slice(0, 200)}`);
  }

  // Stream response
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let output = "";
  let buffer = "";

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
          const json = JSON.parse(trimmed.slice(6)) as { choices?: Array<{ delta?: { content?: string } }> };
          const token = json.choices?.[0]?.delta?.content;
          if (token) output += token;
        } catch { /* skip malformed */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  log("LLM_CALL", `✓ ${model} output (${output.length} chars)`, {
    outputPreview: output.slice(0, 400),
  });

  return { output, durationMs, status: response.status };
}

async function callWithFallback(
  models: string[],
  messages: LLMMessage[],
  label: string,
  signal?: AbortSignal,
): Promise<string> {
  for (let i = 0; i < models.length; i++) {
    try {
      log("PROVIDER", `Trying model ${i + 1}/${models.length}: ${models[i]} for ${label}`);
      const result = await callOpenRouter(models[i], messages, signal);
      return result.output;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429");
      log("PROVIDER", `✗ Model ${models[i]} failed (${is429 ? "429 rate-limited" : "error"}): ${msg.slice(0, 120)}`);
      if (i === models.length - 1) throw err;
      // On 429 wait before trying next model
      if (is429) {
        log("PROVIDER", `Waiting 8s before trying next model...`);
        await new Promise(r => setTimeout(r, 8_000));
      }
      log("PROVIDER", `→ Falling back to ${models[i + 1]}`);
    }
  }
  throw new Error("All models exhausted");
}

// ─── Pipeline Phases ──────────────────────────────────────────────────────────

const PLANNING_MODELS = [
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const SEARCH_MODELS = [
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

function cleanOutput(raw: string): string {
  // Strip markdown fences
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Find first { or [
  const start = s.search(/[\[{]/);
  if (start > 0) s = s.slice(start);
  // Find last } or ]
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (end >= 0) s = s.slice(0, end + 1);
  return s.trim();
}

async function runResearch(
  destination: string,
  dietary: string[],
  interests: string[],
): Promise<Array<{ title: string; snippet: string }>> {
  logSep(`RESEARCH: ${destination}`);
  const dietaryStr = dietary.join(" ");
  const interestsStr = interests.join(" ");

  const queries = [
    `${destination} top tourist attractions sightseeing must-see places`,
    `${destination} best restaurants ${dietaryStr} food local cuisine`.trim(),
    `${destination} ${interestsStr} activities experiences things to do`.trim(),
  ];

  log("RESEARCH", `Running ${queries.length} parallel searches for ${destination}`);

  // Sequential to avoid exhausting free-tier rate limits
  const all: Array<Array<{ title: string; snippet: string }>> = [];
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    log("RESEARCH", `Search ${i + 1}/${queries.length}: "${q.slice(0, 80)}"`);
    const start = Date.now();
    try {
      const messages: LLMMessage[] = [
        {
          role: "system",
          content: "You are a travel research assistant. Given a search query about travel, return a JSON array of up to 5 informative results. Each result must have: title (string), snippet (2-3 sentences of useful travel info). Respond with ONLY the JSON array, no markdown.",
        },
        {
          role: "user",
          content: `Search query: "${q}"\n\nReturn a JSON array of travel research results.`,
        },
      ];

      const raw = await callWithFallback(SEARCH_MODELS, messages, `search-${i + 1}`);
      const cleaned = cleanOutput(raw);
      const parsed = JSON.parse(cleaned) as Array<{ title?: string; snippet?: string }>;
      const results = (Array.isArray(parsed) ? parsed : [])
        .slice(0, 5)
        .map(r => ({ title: String(r.title ?? ""), snippet: String(r.snippet ?? "") }))
        .filter(r => r.title || r.snippet);

      log("RESEARCH", `Search ${i + 1} done [${Date.now() - start}ms]: ${results.length} results`);
      all.push(results);
    } catch (err) {
      log("RESEARCH", `Search ${i + 1} FAILED: ${err instanceof Error ? err.message : err}`);
      all.push([]);
    }
  }
  const merged = all.flat().slice(0, 20);
  log("RESEARCH", `Total merged results: ${merged.length}`);
  return merged;
}

async function runPlanningDay(
  dayNum: number,
  totalDays: number,
  systemPrompt: string,
  tripContext: { destination: string; startDate: string },
  researchResults: Array<{ title: string; snippet: string }>,
): Promise<Record<string, unknown>> {
  log("PLANNING", `Generating Day ${dayNum}/${totalDays}`);

  const startDate = new Date(tripContext.startDate);
  startDate.setDate(startDate.getDate() + dayNum - 1);
  const dateStr = startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  let userPrompt = `Generate the itinerary for Day ${dayNum} of ${totalDays} (${dateStr}).`;

  if (researchResults.length > 0) {
    userPrompt += "\n\nResearch context for inspiration:";
    researchResults.slice(0, 5).forEach(r => {
      userPrompt += `\n  - ${r.title}: ${r.snippet.slice(0, 150)}`;
    });
  }

  userPrompt += `\n\nRespond with ONLY the JSON object for day ${dayNum}. Set "day": ${dayNum}.`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await callWithFallback(PLANNING_MODELS, messages, `day-${dayNum}`);
      const cleaned = cleanOutput(raw);
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      if (!parsed.day || !parsed.morning) {
        log("PLANNING", `Day ${dayNum} attempt ${attempt + 1}: invalid schema`, {
          keys: Object.keys(parsed),
          preview: JSON.stringify(parsed).slice(0, 200),
        });
        if (attempt < MAX_RETRIES) {
          messages.push({ role: "assistant", content: raw });
          messages.push({ role: "user", content: `The response was missing required fields (day, morning). Please retry with the exact schema: {"day": ${dayNum}, "title": "...", "morning": {"activities": [...], "breakfast": "..."}, "afternoon": {...}, "evening": {...}}` });
          continue;
        }
      } else {
        log("PLANNING", `✓ Day ${dayNum} generated successfully`, {
          title: parsed.title,
          morningActivities: (parsed.morning as Record<string, unknown>)?.activities,
          afternoonActivities: (parsed.afternoon as Record<string, unknown>)?.activities,
        });
        return parsed;
      }
    } catch (err) {
      log("PLANNING", `Day ${dayNum} attempt ${attempt + 1} error: ${err instanceof Error ? err.message : err}`);
      if (attempt === MAX_RETRIES) {
        log("PLANNING", `Day ${dayNum} using FALLBACK`);
        return {
          day: dayNum,
          title: `Day ${dayNum} in ${tripContext.destination}`,
          morning: { activities: ["Explore the local area"], breakfast: "Local breakfast cafe" },
          afternoon: { activities: ["Visit a local attraction"], lunch: "Local restaurant" },
          evening: { activities: ["Evening stroll"], dinner: "Local dinner" },
        };
      }
    }
  }

  return {
    day: dayNum,
    title: `Day ${dayNum}`,
    morning: { activities: ["Explore the local area"] },
    afternoon: { activities: ["Visit a local attraction"] },
    evening: { activities: ["Dinner at a local restaurant"] },
  };
}

// ─── DB Operations ─────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function persistItinerary(
  supabase: ReturnType<typeof getSupabase>,
  tripId: string,
  jobId: string,
  days: Array<Record<string, unknown>>,
  createdBy: string,
) {
  logSep("PERSIST TO DATABASE");

  // Delete old AI-generated items
  const { error: deleteError } = await supabase
    .from("itinerary_items")
    .delete()
    .eq("trip_id", tripId)
    .eq("is_ai_generated", true);

  if (deleteError) log("DB", `Warning: delete error: ${deleteError.message}`);
  else log("DB", "Deleted old AI-generated items");

  const aiUserId = process.env.AI_SYSTEM_USER_ID ?? createdBy;
  const items: Record<string, unknown>[] = [];

  for (const day of days) {
    const dayNum = day.day as number;
    let orderIndex = 0;

    const addItems = (slot: string, activities?: string[], meal?: string) => {
      if (activities) {
        for (const activity of activities) {
          items.push({
            trip_id: tripId,
            created_by: aiUserId,
            type: "activity",
            title: activity,
            activity_description: activity,
            time_slot: slot,
            day_number: dayNum,
            order_index: orderIndex++,
            is_ai_generated: true,
            all_day: false,
          });
        }
      }
      if (meal) {
        items.push({
          trip_id: tripId,
          created_by: aiUserId,
          type: "activity",
          title: meal,
          activity_description: meal,
          time_slot: slot,
          food_suggestion: meal,
          day_number: dayNum,
          order_index: orderIndex++,
          is_ai_generated: true,
          all_day: false,
        });
      }
    };

    const morning = day.morning as Record<string, unknown> | undefined;
    const afternoon = day.afternoon as Record<string, unknown> | undefined;
    const evening = day.evening as Record<string, unknown> | undefined;

    addItems("morning", morning?.activities as string[], morning?.breakfast as string);
    addItems("afternoon", afternoon?.activities as string[], afternoon?.lunch as string);
    addItems("evening", evening?.activities as string[], evening?.dinner as string);
  }

  log("DB", `Inserting ${items.length} itinerary items`);

  const { error: insertError } = await supabase.from("itinerary_items").insert(items);
  if (insertError) {
    log("DB", `✗ Insert error: ${insertError.message}`);
    throw new Error(`Failed to insert itinerary items: ${insertError.message}`);
  }
  log("DB", `✓ Inserted ${items.length} items`);

  // Update trip status
  const { error: tripUpdateError } = await supabase
    .from("trips")
    .update({
      ai_itinerary_data: { days } as unknown,
      itinerary_status: "completed",
      itinerary_generated_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (tripUpdateError) log("DB", `Warning: trip update error: ${tripUpdateError.message}`);
  else log("DB", "✓ Trip status set to 'completed'");

  // Mark job completed
  const { error: jobUpdateError } = await supabase
    .from("itinerary_generation_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);

  if (jobUpdateError) log("DB", `Warning: job update error: ${jobUpdateError.message}`);
  else log("DB", `✓ Job ${jobId} marked completed`);

  return items.length;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const tripId = process.argv[2] ?? "0bb5a13c-0673-4f31-aec5-2ca16841f689";
  const totalStart = Date.now();

  logSep(`E2E PIPELINE TEST — Trip: ${tripId}`);
  log("MAIN", "Starting full pipeline test", {
    openRouterKey: process.env.OPENROUTER_API_KEY ? `set (${process.env.OPENROUTER_API_KEY.slice(0, 8)}...)` : "MISSING",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  });

  const supabase = getSupabase();

  // ── Step 1: Reset stuck jobs & load trip ────────────────────────────────────
  logSep("STEP 1: Reset stuck jobs & load trip context");

  const { error: resetJobsError } = await supabase
    .from("itinerary_generation_jobs")
    .update({ status: "failed", error_message: "Reset by e2e test", completed_at: new Date().toISOString() })
    .eq("trip_id", tripId)
    .eq("status", "streaming");

  log("DB", resetJobsError ? `Warning resetting jobs: ${resetJobsError.message}` : "Stuck jobs reset to 'failed'");

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    log("MAIN", `✗ Trip not found: ${tripError?.message}`);
    saveTrace();
    process.exit(1);
  }

  log("MAIN", "✓ Trip loaded", {
    name: trip.name,
    destination: trip.destination_main,
    dates: `${trip.start_date} → ${trip.end_date}`,
    currentStatus: trip.itinerary_status,
  });

  // ── Step 2: Load members ─────────────────────────────────────────────────────
  const { data: members } = await supabase
    .from("trip_members")
    .select("profile_id, profiles:profiles!trip_members_profile_id_fkey(id, preferences, first_name, last_name)")
    .eq("trip_id", tripId)
    .eq("invitation_status", "accepted") as { data: Array<{
      profile_id: string;
      profiles: { id: string; first_name?: string; last_name?: string; preferences?: { dietary?: string[]; interests?: string[] } } | null;
    }> | null };

  const allInterests: string[] = [];
  const allDietary: string[] = [];

  (members ?? []).forEach(m => {
    const prefs = m.profiles?.preferences;
    (prefs?.interests ?? []).forEach(i => { if (i && !allInterests.includes(i.toLowerCase())) allInterests.push(i.toLowerCase()); });
    (prefs?.dietary ?? []).forEach(d => { if (d && !allDietary.includes(d.toLowerCase())) allDietary.push(d.toLowerCase()); });
  });

  log("CONTEXT", "Members loaded", {
    count: members?.length ?? 0,
    interests: allInterests,
    dietary: allDietary,
    names: members?.map(m => m.profiles?.first_name).filter(Boolean),
  });

  const startDate = trip.start_date ?? new Date().toISOString().split("T")[0];
  const endDate = trip.end_date ?? startDate;
  const tripLengthDays = Math.max(1, Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ) + 1);

  log("CONTEXT", `Trip length: ${tripLengthDays} day(s)`, { startDate, endDate });

  // ── Step 3: Create new job ───────────────────────────────────────────────────
  logSep("STEP 3: Create new job");

  const { data: job, error: jobError } = await supabase
    .from("itinerary_generation_jobs")
    .insert({ trip_id: tripId, status: "streaming" })
    .select("id")
    .single();

  if (jobError || !job) {
    log("MAIN", `✗ Failed to create job: ${jobError?.message}`);
    saveTrace();
    process.exit(1);
  }

  await supabase.from("trips").update({ itinerary_status: "generating" }).eq("id", tripId);
  log("DB", `✓ Job created: ${job.id}`);

  // ── Step 4: Research ─────────────────────────────────────────────────────────
  const destination = trip.destination_main ?? "Mumbai";
  const researchResults = await runResearch(destination, allDietary, allInterests);

  // ── Step 5: Build system prompt ──────────────────────────────────────────────
  logSep("STEP 5: Build system prompt");

  const systemPrompt = `You are an expert travel planner for ${destination}. Generate a single day's itinerary as valid JSON.

TRIP CONTEXT:
- Destination: ${destination}
- Travel style: ${trip.travel_style ?? "Group"}
- Budget: ${trip.budget ?? "mid"}
- Group size: ${members?.length ?? 1} travelers
- Group interests (personalize to these): ${allInterests.join(", ") || "general travel"}
- Dietary restrictions (MUST follow for all food): ${allDietary.join(", ") || "none"}
- Must-do activities: ${Array.isArray(trip.must_do_activities) ? trip.must_do_activities.join(", ") : "none"}

OUTPUT FORMAT - respond with ONLY this JSON, no markdown, no explanation:
{
  "day": <number>,
  "title": "<short day theme>",
  "morning": {
    "activities": ["<specific place/activity 1>", "<specific place/activity 2>"],
    "breakfast": "<specific restaurant or food recommendation>"
  },
  "afternoon": {
    "activities": ["<specific place/activity 1>", "<specific place/activity 2>"],
    "lunch": "<specific restaurant>"
  },
  "evening": {
    "activities": ["<specific place/activity 1>"],
    "dinner": "<specific restaurant respecting dietary restrictions>"
  }
}

RULES:
- Use REAL specific place names (e.g., "Gateway of India", not "local monument")
- All food MUST respect dietary restrictions: ${allDietary.join(", ") || "none"}
- Activities must match interests: ${allInterests.join(", ") || "general travel"}
- 2-3 activities per time period
- No generic phrases like "explore the area" or "visit local attractions"`;

  log("PROMPT", "System prompt built", {
    length: systemPrompt.length,
    preview: systemPrompt.slice(0, 300),
  });

  // ── Step 6: Generate days in parallel ────────────────────────────────────────
  logSep(`STEP 6: Generate ${tripLengthDays} day(s) in parallel`);

  // Sequential to avoid exhausting free-tier rate limits
  const days: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= tripLengthDays; i++) {
    const day = await runPlanningDay(i, tripLengthDays, systemPrompt, { destination, startDate }, researchResults);
    days.push(day);
  }
  days.sort((a, b) => (a.day as number) - (b.day as number));

  log("PLANNING", `✓ All ${days.length} days generated`);

  // Check for generic fallback
  const genericPhrases = ["explore the local area", "visit a local attraction", "dinner at a local restaurant"];
  days.forEach(d => {
    const text = JSON.stringify(d).toLowerCase();
    const generics = genericPhrases.filter(p => text.includes(p));
    if (generics.length > 0) {
      log("QUALITY", `⚠ Day ${d.day} contains generic fallback: ${generics.join(", ")}`);
    } else {
      log("QUALITY", `✓ Day ${d.day} — no generic fallback detected`);
    }
  });

  // ── Step 7: Persist to DB ────────────────────────────────────────────────────
  const itemCount = await persistItinerary(supabase, tripId, job.id, days, trip.created_by);

  // ── Step 8: Verify DB ─────────────────────────────────────────────────────────
  logSep("STEP 8: Verify database");

  const { data: verifyItems, error: verifyError } = await supabase
    .from("itinerary_items")
    .select("id, day_number, time_slot, title, is_ai_generated")
    .eq("trip_id", tripId)
    .eq("is_ai_generated", true)
    .order("day_number")
    .order("order_index");

  if (verifyError) {
    log("VERIFY", `✗ Verify query failed: ${verifyError.message}`);
  } else {
    log("VERIFY", `✓ Found ${verifyItems?.length ?? 0} AI-generated items in DB`);
    verifyItems?.slice(0, 10).forEach(item => {
      log("VERIFY", `  Day ${item.day_number} [${item.time_slot}]: ${item.title}`);
    });
  }

  const { data: verifyTrip } = await supabase
    .from("trips")
    .select("itinerary_status, itinerary_generated_at")
    .eq("id", tripId)
    .single();

  log("VERIFY", "Trip status", verifyTrip);

  const totalMs = Date.now() - totalStart;
  logSep(`COMPLETE — ${totalMs}ms total`);
  log("MAIN", `✓ Pipeline complete`, {
    tripId,
    jobId: job.id,
    daysGenerated: days.length,
    itemsInserted: itemCount,
    totalMs,
    success: (verifyItems?.length ?? 0) > 0,
  });

  saveTrace();

  if ((verifyItems?.length ?? 0) === 0) {
    console.error("\n✗ FAILED: No itinerary items in database after pipeline run");
    process.exit(1);
  } else {
    console.log(`\n✓ SUCCESS: ${verifyItems?.length} items in DB, trip status=${verifyTrip?.itinerary_status}`);
    process.exit(0);
  }
}

main().catch(err => {
  log("MAIN", `✗ Unhandled error: ${err instanceof Error ? err.stack : err}`);
  saveTrace();
  process.exit(1);
});
