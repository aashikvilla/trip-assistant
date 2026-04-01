# Migration Plan: React+Vite → Next.js 16 (App Router) + Custom AI Layer

> Last updated: 2026-04-01

## Why Migrate

1. **API Routes** — AI layer needs server-side keys (Claude). Next.js API routes keep them secret without a separate backend.
2. **Server Components** — Dashboard and read-heavy pages render faster with server-side data fetching.
3. **Proxy** — Auth guards become a proper `proxy.ts` (Next.js 16 renamed middleware → proxy). Runs on Node.js runtime, no flash of unauthenticated content.
4. **Timing** — N8N is being removed. Building AI in API routes from day one avoids throwaway work.

---

## Current Stack Snapshot

| Dep | Version | Next.js Compatible? |
|-----|---------|-------------------|
| React | 18.3.1 | Yes (Next 15 supports React 18+) |
| TypeScript | 5.8.3 | Yes |
| Tailwind CSS | 3.4.17 | Yes (keep v3, upgrade to v4 later) |
| React Query | 5.83.0 | Yes (client components) |
| Supabase JS | 2.56.0 | Yes (add @supabase/ssr) |
| shadcn/ui (Radix) | Latest | Yes (native Next.js support) |
| React Router DOM | 6.30.1 | **Remove** — replaced by file-based routing |
| @hello-pangea/dnd | 18.0.1 | Yes (`'use client'`) |
| Vite | 5.4.19 | **Remove** |
| @vitejs/plugin-react-swc | 3.11.0 | **Remove** (Next.js has built-in SWC) |
| Recharts | 2.15.4 | Yes (`'use client'`) |
| React Big Calendar | 1.19.4 | Yes (`'use client'`) |

---

## Available Codemods & Tools

| Tool | Purpose | Use? |
|------|---------|------|
| `npx @next/codemod cra-to-next` | CRA → Next.js (closest available) | **No** — our structure is Vite, not CRA |
| `npx @next/codemod@latest` | Next.js version upgrade transforms | **Later** — for future upgrades |
| `npx @next/codemod middleware-to-proxy .` | Rename middleware→proxy (Next.js 16) | **Yes** — if we scaffold with Next 15 template first |
| Next.js Devtools MCP | AI-assisted migration within Claude Code | **Yes** — installed, use for scaffolding |
| `@supabase/ssr` | Cookie-based auth for SSR | **Yes** — install in Phase 2 |

**No official `vite-to-nextjs` codemod exists.** The migration is manual but straightforward given only 6 routes.

---

## Migration Strategy

### Phase 1: Initialize Next.js + Lift & Shift (~1 session)

**Step 1: Create Next.js project alongside existing code**
```bash
npx create-next-app@latest vibe-trip-next --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Step 2: Copy over source files**
```
# These directories copy as-is:
src/components/    → src/components/
src/types/         → src/types/
src/lib/           → src/lib/
src/hooks/         → src/hooks/
src/services/      → src/services/
src/integrations/  → src/integrations/
```

**Step 3: Create App Router structure**
```
app/
  layout.tsx                  ← Root layout (providers, metadata)
  page.tsx                    ← Landing (Index)
  auth/page.tsx               ← Auth page
  dashboard/page.tsx          ← Dashboard (protected)
  trips/[id]/page.tsx         ← Trip detail (protected)
  settings/page.tsx           ← Settings (protected)
  invite/[token]/page.tsx     ← Join trip
  not-found.tsx               ← 404
```

**Step 4: Automated find-replace**
```bash
# Environment variables
find src/ app/ -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/import\.meta\.env\.VITE_/process.env.NEXT_PUBLIC_/g'

# Rename env vars in .env.local
VITE_SUPABASE_URL       → NEXT_PUBLIC_SUPABASE_URL
VITE_SUPABASE_ANON_KEY  → NEXT_PUBLIC_SUPABASE_ANON_KEY
VITE_N8N_WEBHOOK_URL    → (delete — replaced by API route)
```

**Step 5: Root layout replaces App.tsx + main.tsx**
```tsx
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// ... providers, toasters, metadata
```

**Step 6: Each page is a thin `'use client'` wrapper**
```tsx
// app/dashboard/page.tsx
'use client'
import Dashboard from '@/components/dashboard/Dashboard'
export default function DashboardPage() {
  return <Dashboard />
}
```

**Step 7: Remove Vite artifacts**
- Delete: `vite.config.ts`, `index.html`, `src/main.tsx`
- Remove from package.json: `vite`, `@vitejs/plugin-react-swc`, `lovable-tagger`
- Remove: `react-router-dom` (replaced by Next.js routing)

### Phase 2: Auth + Proxy (~1 session)

> **Next.js 16 change:** `middleware.ts` is deprecated → use `proxy.ts` with `export function proxy()`.
> Proxy runs on **Node.js runtime** (not Edge). Same request/response API as old middleware.

**Install:**
```bash
npm install @supabase/ssr
```

**Create two Supabase client utilities:**

```tsx
// src/integrations/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Cookie-based client for server components & API routes

// src/integrations/supabase/client.ts  (update existing)
import { createBrowserClient } from '@supabase/ssr'
// Browser client for client components
```

**Create proxy (replaces old middleware):**
```tsx
// proxy.ts (project root — NOT middleware.ts)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export function proxy(request: NextRequest) {
  // Refresh expired auth tokens via cookies
  // Redirect unauthenticated users from /dashboard, /trips/*, /settings
  // Redirect authenticated users away from /auth
}

export const config = {
  matcher: ['/dashboard/:path*', '/trips/:path*', '/settings/:path*', '/auth'],
}
```

**Delete:** `ProtectedRoute` and `AuthRoute` components (replaced by proxy)

**Next.js config updates (if needed):**
```js
// next.config.js — proxy-related config keys (renamed from middleware):
// skipProxyUrlNormalize (was skipMiddlewareUrlNormalize)
// experimental.proxyPrefetch (was middlewarePrefetch)
```

### Phase 3: Build AI Layer as API Routes (~2-3 sessions)

```
app/api/
  ai/
    generate-itinerary/route.ts   ← Main generation endpoint
    status/[jobId]/route.ts       ← Job polling endpoint
```

- Claude/Anthropic SDK runs server-side only
- `ANTHROPIC_API_KEY` env var (no `NEXT_PUBLIC_` prefix — server only)
- Reuse existing types from `src/types/n8n.ts` and `src/types/itinerary.ts`
- Frontend hooks call `/api/ai/generate-itinerary` instead of N8N webhook

**Delete:**
- `src/services/n8nComprehensiveService.ts`
- `src/services/n8nMappingService.ts`
- `src/services/n8nResponseParser.ts`

### Phase 4: Optimize (~1 session)

- Convert dashboard page to Server Component (fetch trips server-side)
- Move Supabase service-role calls to API routes
- Remove hardcoded fallback keys from client code
- Add `loading.tsx` files for Suspense boundaries
- Add `error.tsx` files for error boundaries

---

## What NOT To Do

- Don't convert every component to Server Component — `'use client'` first, optimize later
- Don't build a full API abstraction — direct Supabase calls with RLS are fine from client
- Don't SSR the calendar/DnD — inherently client-side
- Don't upgrade Tailwind to v4 during migration — do it separately later
- Don't remove React Query — it works great in Next.js client components

---

## Key Files

### Create
| File | Purpose |
|------|---------|
| `next.config.js` | Next.js config (aliases, image domains) |
| `app/layout.tsx` | Root layout (providers, metadata) |
| `app/*/page.tsx` | 6 route pages |
| `proxy.ts` | Auth guard + token refresh (Next.js 16 convention) |
| `src/integrations/supabase/server.ts` | Server-side Supabase client |
| `app/api/ai/generate-itinerary/route.ts` | AI generation endpoint |
| `app/api/ai/status/[jobId]/route.ts` | Job status polling |

### Modify
| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Use `createBrowserClient` from `@supabase/ssr` |
| `tailwind.config.ts` | Keep v3 config, ensure `content` paths include `app/` |
| `.env.local` | Rename `VITE_*` → `NEXT_PUBLIC_*`, add `ANTHROPIC_API_KEY` |
| `tsconfig.json` | Update for Next.js (`"moduleResolution": "bundler"`) |
| `package.json` | Swap deps (remove vite/router, add next) |

### Delete
| File | Reason |
|------|--------|
| `vite.config.ts` | Replaced by `next.config.js` |
| `index.html` | Replaced by `app/layout.tsx` |
| `src/main.tsx` | Replaced by Next.js entry |
| `src/App.tsx` | Replaced by `app/layout.tsx` + route pages |
| `src/services/n8n*.ts` (3 files) | Replaced by API routes |
| React Router guards | Replaced by `proxy.ts` |

### Unchanged
- All `src/components/ui/*` (shadcn)
- All `src/types/*` (reused)
- All `src/lib/*`
- `supabase/schema.sql`
- Most hooks (just update import paths if needed)

---

## Verification Checklist

- [ ] `npm run dev` starts on localhost:3000
- [ ] Landing page renders at `/`
- [ ] Auth page at `/auth` — signup, login, OAuth work
- [ ] Unauthenticated → redirected to `/auth`
- [ ] Authenticated → redirected away from `/auth`
- [ ] Dashboard loads with trips list
- [ ] Trip detail page loads at `/trips/[id]`
- [ ] DnD calendar works (drag activities between time slots)
- [ ] Chat/messaging works (realtime)
- [ ] AI itinerary generation works via `/api/ai/generate-itinerary`
- [ ] Settings page works
- [ ] Invite flow works at `/invite/[token]`
- [ ] No `VITE_` references remain in codebase
- [ ] No hardcoded API keys in client code
- [ ] `ANTHROPIC_API_KEY` only accessible server-side

---

## Env Vars (Final State)

```bash
# Public (client + server)
NEXT_PUBLIC_SUPABASE_URL=https://qexzncckglegwgbqhhve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# Server only (never exposed to browser)
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ANTHROPIC_API_KEY=<claude api key>
```
