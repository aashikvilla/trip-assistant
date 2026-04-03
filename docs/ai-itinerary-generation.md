# AI Itinerary Generation — How It Works

## Overview

Itinerary generation is a **multi-agent SSE pipeline**. The client opens a Server-Sent Events connection to a Next.js API route, which streams progress events back in real time while three AI agents work in sequence to produce a complete day-by-day trip plan.

---

## Architecture Diagram

```
Browser                Next.js API Route              Supabase DB
  |                          |                              |
  |-- GET /api/ai/generate-  |                              |
  |   itinerary/stream       |                              |
  |   ?tripId=<id>           |                              |
  |                          |-- auth check (session)       |
  |                          |-- create job row             |
  |                          |   (status: streaming)        |
  |                          |-- mark trip: generating      |
  |                          |                              |
  |<-- SSE stream opens ---  |                              |
  |                          |                              |
  |              [Orchestrator.run()]                        |
  |                          |                              |
  |<-- agent_thought ------  | 1. DBContextTool             |
  |                          |   loads trip + members       |
  |                          |   from Supabase              |
  |                          |                              |
  |<-- agent_handoff ------  | 2. ResearchAgent             |
  |<-- tool_call (search) -  |   web searches per dest.     |
  |<-- tool_result --------  |                              |
  |                          |                              |
  |<-- agent_handoff ------  | 3. PlanningAgent             |
  |<-- partial_itinerary --  |   1 LLM call per day         |
  |   (streams each day)     |   ~2000 tokens each          |
  |                          |                              |
  |<-- itinerary_complete -  | 4. Orchestrator persists     |
  |                          |   itinerary_items rows       |
  |                          |   marks trip: completed      |
  |                          |   marks job: completed       |
  |                          |                              |
  | SSE stream closes        |                              |
```

---

## Components

### API Route
`src/app/api/ai/generate-itinerary/stream/route.ts`

- Verifies auth (session cookie) and trip membership
- Creates an `itinerary_generation_jobs` row in Supabase
- Opens a `ReadableStream` in SSE format
- Instantiates the `Orchestrator` and calls `orchestrator.run(tripId, jobId)`
- Has a 180-second watchdog timeout on the job

### Orchestrator
`src/services/ai/orchestrator.ts`

Coordinates the three-agent pipeline:
1. Loads trip context via `DBContextTool`
2. Runs `ResearchAgent` → web searches for each destination
3. Runs `PlanningAgent` → generates itinerary day by day
4. Persists results to `itinerary_items` table
5. Marks trip `itinerary_status = completed`

### ResearchAgent
`src/services/ai/agents/researchAgent.ts`

- Does 2 web searches per destination: general travel guide + dining/restaurants
- Merges results (capped at 10 per destination)
- Passes summaries to PlanningAgent for context

### PlanningAgent
`src/services/ai/agents/planningAgent.ts`

- Makes **one LLM call per day** (key design decision — see Token Strategy below)
- Each call produces a single day's JSON: morning/afternoon/evening activities + meals
- Zod-validates the response; retries up to 2 times on parse failure
- Falls back to generic placeholder activities on final failure (never blocks the whole trip)
- Streams each completed day back to the client via `partial_itinerary` events

### LLM Provider
`src/services/ai/providers/openRouterProvider.ts`

- Reads `AI_PROVIDER` env var (default: `openrouter`)
- Supports: OpenRouter, Ollama, LM Studio, AnythingLLM
- Model set via `OPENROUTER_MODEL` env var (default: `anthropic/claude-3.5-sonnet`)

---

## Token Strategy — Why Per-Day Calls

The original legacy endpoint used a single LLM call for the entire trip. This caused:

- **402 errors** on low-credit accounts (requested 8192 tokens in one shot)
- **Timeout failures** — long-running single calls hit the 180s watchdog

The current architecture solves this by splitting into **one call per day**:

| Approach | Tokens per call | 7-day trip total | Timeout risk |
|---|---|---|---|
| Single call (legacy) | ~8000 | ~8000 | High |
| Per-day (current) | ~2000 | ~14000 | Low — each call finishes in ~10s |

**Trade-off**: Total token spend is higher (~1.75x), but each call is cheap, fast, and independently retryable. Users also see streaming progress as each day completes.

---

## SSE Event Types

The client receives these events on the stream:

| Event type | When |
|---|---|
| `job_created` | Immediately after SSE opens; contains `jobId` for cancellation |
| `agent_start` | An agent begins its work |
| `agent_thought` | An agent logs a status message |
| `agent_handoff` | Orchestrator passes work to next agent |
| `tool_call` | An agent is calling a tool (e.g. web search) |
| `tool_result` | Tool call finished with success/failure |
| `partial_itinerary` | One day's plan is ready (streams progressively) |
| `itinerary_complete` | All days done; full itinerary included |
| `error` | Something failed; `recoverable` flag indicates if retry is possible |

---

## Database Schema

```
itinerary_generation_jobs
  id, trip_id, status (pending|streaming|completed|failed),
  error_message, created_at, completed_at

itinerary_items
  id, trip_id, created_by, type, title, activity_description,
  time_slot, day_number, order_index, is_ai_generated,
  food_suggestion, external_link, all_day

trips
  itinerary_status (idle|generating|completed|failed)
  itinerary_generated_at
  ai_itinerary_data  -- full JSON snapshot of last generation
```

---

## Configuration

Required env vars:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet   # optional, this is the default
AI_PROVIDER=openrouter                          # optional, this is the default
ENABLE_REVIEW_AGENT=true                        # optional, off by default
```

---

## Known Failure Modes

| Error | Cause | Fix |
|---|---|---|
| `402 insufficient credits` | OpenRouter account out of credits | Top up at openrouter.ai/settings/credits |
| `Generation timeout` | Job stuck in `streaming` for >180s | Usually caused by a slow/hanging LLM call; check OpenRouter status |
| Trip stuck in `generating` | Job failed but trip status wasn't reset | Run: `UPDATE trips SET itinerary_status='failed' WHERE itinerary_status='generating'` |
| `Trip not found` | Invalid tripId or RLS blocking access | Check trip exists and service role key is set |

---

## Testing

There is **one SSE endpoint**. The agents are internal and not individually callable. The entire pipeline runs through a single request.

### curl

```bash
# 1. Get your session cookie from browser DevTools → Application → Cookies
#    Copy the value of `sb-<project-ref>-auth-token`

# 2. Stream generation
curl -N \
  -H "Cookie: sb-qexzncckglegwgbqhhve-auth-token=<your-token>" \
  "http://localhost:3000/api/ai/generate-itinerary/stream?tripId=<uuid>"
```

Events arrive as `data: {...}\n\n` lines. The stream closes after `itinerary_complete` or `error`.

### Postman

1. Create a new request: `GET http://localhost:3000/api/ai/generate-itinerary/stream?tripId=<uuid>`
2. In Headers, add: `Cookie: sb-qexzncckglegwgbqhhve-auth-token=<your-token>`
3. Click **Send** — Postman will stream SSE events in the response body in real time
4. Each `data:` line is a JSON `StreamEvent` object

### What to verify

- First event should be `job_created` with a `jobId`
- `agent_handoff` events show transitions: Orchestrator → ResearchAgent → PlanningAgent
- `partial_itinerary` events arrive one per day with the day's JSON
- Final event is `itinerary_complete` with the full itinerary
- Check Supabase: `itinerary_generation_jobs` should show `completed`, `trips.itinerary_status` should be `completed`

---

## Sample LLM Input/Output

### ResearchAgent

The ResearchAgent uses the LLM as a simulated web search tool. It does NOT call external APIs — it asks the LLM to produce travel research from its knowledge.

**Input (system prompt):**
```
You are a travel research assistant. Given a search query about travel,
return a JSON array of up to 8 informative results from your knowledge.
Each result must have: title (string), snippet (2-3 sentence summary of
useful travel info). Respond with ONLY the JSON array, no markdown fences.
```

**Input (user prompt):**
```
Search query: "Dubai travel guide attractions activities things to do tips"

Return a JSON array of travel research results.
```

**Output:**
```json
[
  {
    "title": "Burj Khalifa & Dubai Mall",
    "snippet": "The world's tallest building at 828m offers observation decks on floors 124-148. Adjacent Dubai Mall has 1,200+ shops, an aquarium, and an ice rink. Book At The Top tickets in advance to avoid 2+ hour queues."
  },
  {
    "title": "Dubai Creek & Old Town",
    "snippet": "Take an abra (water taxi) across Dubai Creek for 1 AED. Explore Al Fahidi Historical Neighbourhood with its wind-tower architecture and small museums. The Gold Souk and Spice Souk are walking distance away."
  },
  {
    "title": "Desert Safari",
    "snippet": "Evening desert safaris include dune bashing, camel rides, and BBQ dinner with belly dancing. Book through reputable operators like Arabian Adventures. Best during cooler months (Nov-Mar)."
  }
]
```

### PlanningAgent

One LLM call per day. The system prompt includes trip context, dietary restrictions, and research results.

**Input (system prompt excerpt):**
```
You are an expert travel planner. Generate a single day's itinerary as valid JSON.

TRIP CONTEXT:
- Destination(s): Dubai
- Travel style: Group
- Vibe: Relaxed and fun
- Budget: mid
- Activity level: moderate
- Must-do activities: Desert Safari, Burj Khalifa

RESEARCH INSIGHTS:
Dubai:
  - Burj Khalifa & Dubai Mall: The world's tallest building...
  - Dubai Creek & Old Town: Take an abra across Dubai Creek...

OUTPUT FORMAT - respond with ONLY this JSON structure, no markdown fences:
{
  "day": <number>,
  "title": "<day theme>",
  "morning": { "activities": [...], "breakfast": "..." },
  "afternoon": { "activities": [...], "lunch": "..." },
  "evening": { "activities": [...], "dinner": "...", "local_travel": "..." },
  "hotel_recommendations": ["...", "..."]
}
```

**Input (user prompt):**
```
Generate the itinerary for Day 1 of 5 (Thursday, April 10, 2026).
Respond with ONLY the JSON object for day 1. Set "day": 1.
```

**Output:**
```json
{
  "day": 1,
  "title": "Arrival & Downtown Discovery",
  "morning": {
    "activities": [
      "Check in at hotel and freshen up",
      "Walk around Downtown Dubai and take in the skyline"
    ],
    "breakfast": "Breakfast at Arabica Cafe in Dubai Mall — great pastries and coffee with a view"
  },
  "afternoon": {
    "activities": [
      "Visit Burj Khalifa — At The Top observation deck (pre-book 124th floor tickets)",
      "Explore Dubai Mall Aquarium and Underwater Zoo"
    ],
    "lunch": "Lunch at Zuma Dubai in DIFC — contemporary Japanese, group-friendly"
  },
  "evening": {
    "activities": [
      "Watch the Dubai Fountain show from Souk Al Bahar terrace (shows every 30 mins from 6pm)"
    ],
    "dinner": "Dinner at Al Hadheerah at Bab Al Shams — desert-themed outdoor restaurant with live entertainment",
    "local_travel": "Use the Dubai Metro Red Line for Downtown ↔ DIFC. Taxis are affordable for evening trips."
  },
  "hotel_recommendations": [
    "Rove Downtown — mid-range, walkable to Burj Khalifa and Dubai Mall",
    "Vida Downtown — stylish boutique hotel with rooftop pool overlooking the Fountain"
  ]
}
```

---

## Streaming UI Components

### useItineraryStream hook
`src/hooks/useItineraryStream.ts`

Consumes the SSE stream and returns:
- `events: StreamEvent[]` — all events received so far
- `status: "idle" | "streaming" | "complete" | "error"`
- `itinerary: ParsedItinerary | null` — accumulated from `partial_itinerary` events
- `jobId: string | null` — from the `job_created` event, used for cancellation
- `startStream(tripId)` / `cancel()`

### StreamingThinkingPanel
`src/components/itinerary/StreamingThinkingPanel.tsx`

Renders a collapsible timeline of agent thoughts, handoffs, and tool calls. Shows which agent is currently active (Research = blue, Planning = purple, Review = green) with a pulsing indicator.

### PartialDayCard
`src/components/itinerary/PartialDayCard.tsx`

Renders a single day's itinerary as it arrives. Shows morning/afternoon/evening sections with activities and meal suggestions. A spinner badge indicates when a day is still being generated.

### Progress Calculation

Progress is computed from stream events:

| Event | Progress |
|---|---|
| First event | 5% |
| Handoff to ResearchAgent | 10% |
| Handoff to PlanningAgent | 20% |
| Each `partial_itinerary` day | 20% + (daysReceived / totalDays) × 70% |
| `itinerary_complete` | 100% |
