# Design Document

## Overview

This feature fixes the broken poll voting mechanism and extends polls with deadlines, importance flags, non-responder visibility, and automated/manual reminders. All changes are additive to the existing `trip_polls` / `trip_poll_votes` tables and the `useTripChat` hook. A new lightweight notification system is introduced via a `trip_notifications` table and a Supabase Edge Function (or cron-style API route) for deadline-based reminders.

---

## Root Cause: Broken Voting

The current `votePollMutation` inserts into `trip_poll_votes` correctly, but the `get_trip_chat_messages` RPC (or its fallback) does **not** join `trip_poll_votes` when building `poll_data`. As a result `poll.votes` is always `[]` on the client. The fix is to update the RPC (or fallback query) to include votes, and add a unique constraint on `(poll_id, user_id)` to prevent duplicates.

---

## Architecture

```
CreatePollDialog  ──(extended)──►  useTripChat.createPoll()
                                        │
                                        ▼
                                   trip_polls  (+ expires_at, is_important)
                                        │
PollComponent  ◄──(real-time)──  get_trip_chat_messages RPC
  │  votes, non-responders,              │  (fixed: joins trip_poll_votes)
  │  countdown, nudge button             ▼
  └──────────────────────────►  trip_poll_votes  (unique: poll_id+user_id)

Nudge button / deadline cron ──►  trip_notifications  (new table)
                                        │
                                        ▼
                               NotificationBell (existing or new)
```

---

## Database Changes

### 1. `trip_polls` — add columns

```sql
ALTER TABLE trip_polls
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;
```

### 2. `trip_poll_votes` — add unique constraint

```sql
ALTER TABLE trip_poll_votes
  ADD CONSTRAINT trip_poll_votes_poll_user_unique UNIQUE (poll_id, user_id);
```

### 3. `trip_notifications` — new table

```sql
CREATE TABLE trip_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  poll_id      UUID REFERENCES trip_polls(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('poll_deadline_24h', 'poll_overdue', 'poll_nudge')),
  message      TEXT NOT NULL,
  link         TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id, type)   -- prevents duplicate reminders
);
```

### 4. Fix `get_trip_chat_messages` RPC

The RPC must be updated to LEFT JOIN `trip_poll_votes` and aggregate votes into the `poll_data` JSON. Key change:

```sql
-- Inside the poll_data JSON build:
'votes', COALESCE(
  (SELECT json_agg(json_build_object(
    'user_id',      v.user_id,
    'option_index', v.option_index,
    'rating',       v.rating,
    'user_name',    p.first_name || ' ' || p.last_name
  ))
  FROM trip_poll_votes v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.poll_id = tp.id),
  '[]'::json
)
```

---

## Components

### 1. `CreatePollDialog` — extended

New props added to `onCreatePoll` callback data:

```ts
interface CreatePollData {
  question: string;
  options: string[];
  pollType: 'multiple_choice' | 'yes_no' | 'rating';
  expiresAt?: string | null;   // ISO 8601 UTC string
  isImportant?: boolean;
}
```

New UI elements:
- **Deadline picker**: a `<DateTimePicker>` (shadcn `Calendar` + time `Input`) rendered below Poll Type. Optional — defaults to no deadline.
- **Important toggle**: a `<Switch>` with label "Mark as Important" rendered below the deadline picker.

### 2. `PollComponent` — extended

New props:

```ts
interface PollComponentProps {
  poll: PollData;
  onVote: (data: { pollId: string; optionIndex: number; rating?: number }) => void;
  onNudge?: (pollId: string) => void;   // new
  currentUserId?: string | null;
  tripMembers?: { user_id: string; user_name: string }[];  // new
  isCreator?: boolean;  // new
}
```

New UI sections (rendered inside `CardContent`):

**Countdown timer** (when `expires_at` is set and poll is open):
```tsx
<CountdownTimer expiresAt={poll.expires_at} />
```
Shows `Xd Xh Xm remaining` or `Closing soon` when < 1 hour. Implemented as a client component with `useEffect` + `setInterval` (1-minute tick).

**Important badge** (when `is_important`):
```tsx
<Badge variant="destructive" className="..."><Star /> Important</Badge>
```

**Non-Responders section** (when `is_important && isCreator`):
```tsx
<NonRespondersPanel
  members={tripMembers}
  votes={poll.votes}
  pollId={poll.poll_id}
  isClosed={poll.is_closed}
  onNudge={onNudge}
  nudgeCooldownUntil={poll.nudge_cooldown_until}
/>
```

### 3. `CountdownTimer` — new component

`src/components/trip/CountdownTimer.tsx`

```ts
interface CountdownTimerProps {
  expiresAt: string;  // ISO 8601
}
```

- Uses `useEffect` with a 60-second interval to recompute remaining time.
- Returns `null` if `expiresAt` is in the past (poll already closed).
- Displays `<Clock />` icon + formatted string.

### 4. `NonRespondersPanel` — new component

`src/components/trip/NonRespondersPanel.tsx`

```ts
interface NonRespondersPanelProps {
  members: { user_id: string; user_name: string }[];
  votes: PollVote[];
  pollId: string;
  isClosed: boolean;
  onNudge?: (pollId: string) => void;
  nudgeCooldownUntil?: string | null;
}
```

- Computes non-responders: `members.filter(m => !votes.find(v => v.user_id === m.user_id))`.
- Renders a collapsible `<Collapsible>` (shadcn) showing the list of names.
- Shows "Nudge Non-Responders" `<Button>` when `!isClosed && onNudge && nonResponders.length > 0`.
- Shows cooldown countdown if `nudgeCooldownUntil` is in the future.

---

## Data Model Extensions

```ts
// Extended PollData in useTripChat.ts
export interface PollData {
  poll_id: string;
  question: string;
  poll_type: 'multiple_choice' | 'yes_no' | 'rating';
  options: string[];
  settings: { multiple_votes: boolean; anonymous: boolean };
  expires_at: string | null;
  is_closed: boolean;
  is_important: boolean;          // new
  nudge_cooldown_until: string | null;  // new — derived from trip_notifications
  votes: PollVote[];
  creator_id: string;             // new — needed for isCreator check
}
```

---

## Hooks

### `useTripChat` — extended

**`createPoll` mutation** — pass `expires_at` and `is_important` to the insert:

```ts
await supabase.from('trip_polls').insert({
  message_id: message.id,
  question,
  poll_type: pollType,
  options,
  settings: JSON.stringify(settings),
  expires_at: expiresAt || null,
  is_important: isImportant ?? false,
});
```

**`votePoll` mutation** — add upsert conflict handling:

```ts
const { data, error } = await supabase
  .from('trip_poll_votes')
  .upsert(
    { poll_id: pollId, user_id: user.id, option_index: optionIndex, rating: rating ?? null },
    { onConflict: 'poll_id,user_id' }
  )
  .select()
  .single();
```

**`nudgePoll` mutation** — new:

```ts
nudgePoll: (pollId: string) => void
```

Calls `POST /api/polls/nudge` with `{ pollId, tripId }`. The API route creates `trip_notifications` records for each non-responder and enforces the 1-hour rate limit.

### `usePollMembers` — new hook

`src/hooks/usePollMembers.ts`

Fetches trip members for the non-responder computation. Reuses the existing `trip_members` table join.

```ts
function usePollMembers(tripId: string): {
  members: { user_id: string; user_name: string }[];
  isLoading: boolean;
}
```

---

## API Routes

### `POST /api/polls/nudge` — `src/app/api/polls/nudge/route.ts`

**Request:**
```json
{ "pollId": "uuid", "tripId": "uuid" }
```

**Logic:**
1. Authenticate via Supabase SSR — return 401 if no session.
2. Verify the caller is the poll creator — return 403 if not.
3. Check `trip_notifications` for a `poll_nudge` record created within the last hour for this poll — return 429 with `retryAfter` if rate-limited.
4. Fetch current non-responders (trip members minus voters).
5. Bulk-insert `trip_notifications` rows (type `poll_nudge`) for each non-responder, using `ON CONFLICT DO NOTHING`.
6. Return `{ notified: number, retryAfter: null }`.

**Response (200):**
```json
{ "notified": 3, "retryAfter": null }
```

**Response (429):**
```json
{ "notified": 0, "retryAfter": "2024-07-15T14:30:00Z" }
```

### `POST /api/polls/check-deadlines` — `src/app/api/polls/check-deadlines/route.ts`

Intended to be called by a Supabase cron job or Vercel cron (every 15 minutes).

**Logic:**
1. Authenticate via service role key (Bearer token in `Authorization` header checked against `CRON_SECRET` env var).
2. Find all open polls where `expires_at <= NOW() + INTERVAL '24 hours'` and `expires_at > NOW()`.
3. For each such poll, find non-responders and insert `poll_deadline_24h` notifications (skip if already exists via unique constraint).
4. Find all open polls where `expires_at <= NOW()`.
5. Set `is_closed = true` on those polls.
6. For each newly-closed poll, insert `poll_overdue` notifications for non-responders.
7. Return counts.

---

## Notification Display

Notifications are surfaced via a `NotificationBell` component (to be added to the trip header or global nav). For this spec, the minimum viable implementation stores notifications in `trip_notifications` and marks them read when the user views TripChat. A future spec can add a full notification center.

The `trip_notifications` table is subscribed to via Supabase real-time in a `useNotifications` hook, which provides an unread count badge.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Duplicate vote (unique constraint violation) | `upsert` with `onConflict` silently updates; UI shows existing vote |
| Vote on closed poll | Client checks `is_closed` before calling `onVote`; shows "Poll is closed" toast |
| Nudge rate-limited | API returns 429; UI shows "Next nudge available in Xh Xm" |
| Deadline check cron fails | Logged server-side; polls auto-close on next successful run |
| RPC not updated | Fallback query in `useTripChat` extended to also fetch votes |

---

## Correctness Properties

1. **Vote uniqueness invariant**: for any `(poll_id, user_id)` pair, the `trip_poll_votes` table contains at most one row at all times.
2. **Round-trip vote display**: a vote submitted by user U on poll P is always visible in `poll.votes` when the poll is next fetched, i.e., `submit(vote) → fetch(poll).votes.includes(vote)`.
3. **Non-responder complement**: `nonResponders.length + voters.length === tripMembers.length` at all times while the member list is stable.
4. **Deadline monotonicity**: once `is_closed = true` is set on a poll, it is never set back to `false`.
5. **Notification idempotence**: running the deadline check cron multiple times for the same poll produces the same set of notifications (no duplicates due to unique constraint on `(poll_id, user_id, type)`).
6. **Nudge rate-limit invariant**: for any poll, at most one `poll_nudge` batch is created per 60-minute window.
