# Vibe Trip — Project Context

## What This Is
AI-powered group travel planning app. Users create trips, invite members, and generate AI itineraries via N8N webhook. Built with React + Vite + TypeScript + Supabase.

**Key user flows:** Create trip → Invite members → Set preferences → Generate AI itinerary → Edit/view calendar-style itinerary.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS v3, shadcn/ui (Radix) |
| State | React Query v5, React Hook Form, Zod |
| Routing | react-router-dom v6 |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) |
| AI | N8N webhook (`VITE_N8N_WEBHOOK_URL`) |
| DnD | @hello-pangea/dnd |

---

## Project Status

**This project was copied from another codebase.** The UI components are largely complete; the **backend/DB must be rebuilt fresh** against a new Supabase instance.

### What exists (UI-complete, needs DB wiring):
- Auth pages, dashboard, trip detail, settings, onboarding
- Calendar-style itinerary view (day + week views, drag & drop)
- Trip creation form with preferences (travel style, vibe, budget, must-do)
- Member invitation system (email, shareable link, 6-digit code, 4-char trip code)
- AI itinerary generation with async job tracking UI
- Expense tracking, group discussion/chat

### What needs to be built fresh:
- **Supabase schema** — design and run migrations from scratch on new project
- **RLS policies** — all tables need proper row-level security
- **Supabase types** — regenerate `src/types/database.types.ts` from new schema
- **N8N webhook** — test and verify integration with real endpoint

### Files to delete (copied artifacts, not needed):
- `FINAL_IMPLEMENTATION_PLAN.md` — old planning doc
- `RECOMMENDED_PACKAGES.md` — already installed
- `add_itinerary_columns.sql` — superseded by migrations
- `execute-on-supabase-website.sql` — one-time run artifact
- `run-migration.js` — migration runner script, not needed
- `test-n8n-webhook.js` — ad-hoc test script
- `project_summary.txt` — replaced by this file
- `bun.lockb` — using npm (package-lock.json exists)

---

## Key Architecture

### DB Schema (canonical — rebuild to match this)
```
profiles           — extends auth.users, stores preferences (dietary etc.)
trips              — core trip record; travel_style, vibe, budget, must_do[], trip_code
trip_members       — profiles ↔ trips join; role (owner/editor/viewer), invitation_status
trip_invitations   — invite tokens, codes, expiry
itinerary_items    — activities per trip/day; time_slot, ai_generated, drag order
itinerary_generation_jobs — async job tracking (pending/processing/completed/failed)
expenses           — per-trip expense tracking
trip_messages      — realtime chat per trip
```

### Service layer (`src/services/`)
- `itineraryService.ts` — CRUD for itinerary items
- `enhancedItineraryService.ts` — bulk ops, hotel recommendations, travel info
- `n8nMappingService.ts` — maps trip data → N8N request shape
- `n8nResponseParser.ts` — parses N8N response → DB records
- `n8nComprehensiveService.ts` — orchestrates the full generation flow

### Types (`src/types/`)
- `database.types.ts` — **auto-generated from Supabase**, never hand-edit
- `enums.ts` — TravelStyle, TripVibe, Budget enums
- `itinerary.ts` — enhanced activity/hotel/travel-info interfaces
- `n8n.ts` — N8N request/response shapes
- `trip.ts` — trip-related interfaces

### N8N Request Shape (key contract)
```typescript
{ trip_details: { destinations, trip_name, trip_length_days, travel_dates,
                  travel_style, vibe, budget, must_do, description },
  travelers: [{ id, interests }],
  global_preferences: { dietary: string[] }  // deduplicated from all members
}
```

---

## Dev Rules

- **Never hand-edit `database.types.ts`** — regenerate via `supabase gen types typescript`
- **RLS on every table** — default deny, explicit policies per role
- Supabase client lives in `src/integrations/supabase/client.ts` — single instance
- React Query for all server state; no local state for data that lives in DB
- Zod schemas in `src/types/` validate at form/API boundaries only
- No `console.log` in committed code
- shadcn components in `src/components/ui/` — don't modify, extend via composition

---

## Env Vars Required
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_N8N_WEBHOOK_URL=
```
