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
