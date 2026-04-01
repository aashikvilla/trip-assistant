# Vibe Trip — Project Context

## What This Is
AI-powered group travel planning app. Users create trips, invite members, and generate AI itineraries via N8N webhook. Built with **Next.js 16 + TypeScript + Supabase**.

**Key user flows:** Create trip → Invite members → Set preferences → Generate AI itinerary → Edit/view calendar-style itinerary → Use offline/on mobile as PWA.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v3, shadcn/ui (Radix) |
| State | React Query v5, React Hook Form, Zod |
| Routing | Next.js App Router |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) |
| AI | N8N webhook (`NEXT_PUBLIC_N8N_WEBHOOK_URL`) |
| PWA | Manual Workbox SW (`public/sw.js`), `idb` for IndexedDB |
| Push | `web-push` + VAPID, `/api/push/*` routes |

---

## Project Status

**Migrated from React/Vite to Next.js 16.** UI components complete. Backend/DB must be built against a new Supabase instance.

### Completed features:
- Auth pages, dashboard, trip detail, settings, onboarding
- Calendar-style itinerary view (day + week views, drag & drop)
- Trip creation with preferences (travel style, vibe, budget, must-do)
- Member invitation (email, shareable link, 6-digit code, 4-char trip code)
- AI itinerary generation with async job tracking UI
- Expense tracking, group chat with polls, reactions, typing indicators
- **PWA — fully implemented** (see below)

### What still needs DB wiring:
- **Supabase schema** — run migrations from `supabase/migrations/`
- **RLS policies** — all tables need proper row-level security
- **Supabase types** — regenerate `src/integrations/supabase/types.ts`
- **N8N webhook** — test and verify integration

---

## PWA Architecture (`feature/pwa-mobile-experience`)

### Service Worker: `public/sw.js`
Manual Workbox-based SW. App-shell caching, network-first for Supabase, offline fallback page.

### Offline Store: `src/lib/offline-store.ts`
IndexedDB (`vibe-trip-offline` DB) with three stores:
- `trips` — full trip snapshot (itinerary, members, expenses, bookings, documents)
- `sync-queue` — pending write actions (see `src/lib/background-sync.ts`)
- `install-prompt` — tracks 30-day suppression of install prompt

### Connectivity: `src/lib/connectivity.ts` + `src/hooks/useConnectivity.ts`
State machine: `online | offline | degraded`. React hook exposes `{ status, isOnline, isOffline, isDegraded }`.

### PWA Components (`src/components/pwa/`)
- `OfflineBanner` — shown when offline/degraded
- `InstallPrompt` — `beforeinstallprompt` capture + 30-day dismissal suppression
- `UpdatePrompt` — SW waiting state → "Refresh to update" toast
- `DownloadTripButton` — saves trip snapshot to IndexedDB; shows progress
- `OfflineStorageInfo` — shows size/timestamp of cached trip; remove button
- `ServiceWorkerRegistration` — client component that registers `public/sw.js`

### Mobile UI
- `MobileBottomNav` (`src/components/trip/MobileBottomNav.tsx`) — fixed bottom bar, `md:hidden`, tabs: itinerary/chat/polls/expenses/bookings/members
- `SwipeableTabs` (`src/components/trip/SwipeableTabs.tsx`) — pointer-event swipe navigation
- `usePullToRefresh` — touch pull-down → invalidates React Query cache
- Standalone PWA detection (`window.matchMedia('(display-mode: standalone)')`) → custom back button in TripDetail

### Push Notifications
- VAPID keys in `.env.local` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`)
- `push_subscriptions` table — see `supabase/migrations/20260402000000_push_subscriptions.sql`
- API routes: `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe`, `POST /api/push/send`
- `src/lib/push-notifications.ts` — subscribe/unsubscribe/mute logic
- `src/hooks/usePushNotifications.ts` — React hook

### Offline Message Queuing (TripChat)
When offline, `sendMessage` is replaced by `enqueueAction({ tripId, type: 'send_message', payload })`. Toast feedback: "Message queued — will send when online."

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
push_subscriptions — web push endpoint + keys per user
```

### Service layer (`src/services/`)
- `itineraryService.ts` — CRUD for itinerary items
- `enhancedItineraryService.ts` — bulk ops, hotel recommendations, travel info
- `n8nMappingService.ts` — maps trip data → N8N request shape
- `n8nResponseParser.ts` — parses N8N response → DB records
- `n8nComprehensiveService.ts` — orchestrates the full generation flow

### Types (`src/integrations/supabase/types.ts`)
**Auto-generated from Supabase** — never hand-edit. Regenerate via `supabase gen types typescript`.

---

## Dev Rules

- **Never hand-edit `src/integrations/supabase/types.ts`** — regenerate via `supabase gen types typescript`
- **RLS on every table** — default deny, explicit policies per role
- Supabase client: `src/integrations/supabase/client.ts` exports `supabase` (not `createClient`)
- React Query for all server state
- No `console.log` in committed code
- shadcn components in `src/components/ui/` — don't modify, extend via composition
- Tab IDs in TripDetail use `TabId` from `MobileBottomNav` — "chat" not "discussion"

---

## Env Vars Required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_N8N_WEBHOOK_URL=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```
