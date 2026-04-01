# Tasks

## Task List

- [ ] 1. Database migrations
  - [ ] 1.1 Add `expires_at` (TIMESTAMPTZ) and `is_important` (BOOLEAN DEFAULT FALSE) columns to `trip_polls`
  - [ ] 1.2 Add unique constraint `(poll_id, user_id)` to `trip_poll_votes`
  - [ ] 1.3 Create `trip_notifications` table with columns: id, trip_id, poll_id, user_id, type, message, link, is_read, is_resolved, created_at, and unique constraint on `(poll_id, user_id, type)`
  - [ ] 1.4 Update `get_trip_chat_messages` RPC to LEFT JOIN `trip_poll_votes` and aggregate votes into `poll_data.votes` JSON array including `user_id`, `option_index`, `rating`, and `user_name`
  - [ ] 1.5 Add `creator_id` to the `poll_data` JSON returned by the RPC (select `trip_polls.created_by` or equivalent)

- [ ] 2. Fix poll voting mechanism
  - [ ] 2.1 Update `votePollMutation` in `src/hooks/useTripChat.ts` to use `upsert` with `onConflict: 'poll_id,user_id'` instead of plain `insert`
  - [ ] 2.2 Add real-time subscription for `trip_poll_votes` table changes in `useTripChat` to invalidate `['trip-chat', tripId]` query
  - [ ] 2.3 Update `PollData` interface in `useTripChat.ts` to include `is_important`, `creator_id`, and `nudge_cooldown_until` fields
  - [ ] 2.4 Add error handling in `PollComponent` to display a toast and preserve selection when vote submission fails

- [ ] 3. Extend `CreatePollDialog` with deadline and importance
  - [ ] 3.1 Add `expiresAt` (optional ISO string) and `isImportant` (boolean) to the `onCreatePoll` callback data type
  - [ ] 3.2 Add an optional date-time picker (shadcn `Calendar` + time `Input`) for the deadline below the Poll Type selector
  - [ ] 3.3 Add a `Switch` toggle labelled "Mark as Important" below the deadline picker
  - [ ] 3.4 Pass `expiresAt` and `isImportant` through `handlePollCreate` in `TripChat.tsx` to `createPoll` mutation

- [ ] 4. Extend `createPoll` mutation in `useTripChat`
  - [ ] 4.1 Accept `expiresAt` and `isImportant` parameters in `createPollMutation.mutationFn`
  - [ ] 4.2 Include `expires_at` and `is_important` in the `trip_polls` insert payload

- [ ] 5. Create `CountdownTimer` component
  - [ ] 5.1 Create `src/components/trip/CountdownTimer.tsx` with a `useEffect` / `setInterval` (60s tick) that computes days, hours, minutes remaining from `expiresAt`
  - [ ] 5.2 Return `null` when `expiresAt` is in the past; show "Closing soon" when < 1 hour remains
  - [ ] 5.3 Render a `<Clock />` icon with the formatted remaining time string

- [ ] 6. Create `NonRespondersPanel` component
  - [ ] 6.1 Create `src/components/trip/NonRespondersPanel.tsx` that computes non-responders by diffing `members` against `votes`
  - [ ] 6.2 Render a shadcn `<Collapsible>` showing the non-responder count in the header and names in the body
  - [ ] 6.3 Show "Everyone has responded" message when `nonResponders.length === 0`
  - [ ] 6.4 Render a "Nudge Non-Responders" `<Button>` when poll is open, `onNudge` is provided, and non-responders exist
  - [ ] 6.5 Show cooldown message ("Next nudge in Xh Xm") when `nudgeCooldownUntil` is in the future

- [ ] 7. Create `usePollMembers` hook
  - [ ] 7.1 Create `src/hooks/usePollMembers.ts` that queries `trip_members` joined with `profiles` for a given `tripId`
  - [ ] 7.2 Return `{ members: { user_id, user_name }[], isLoading }` for use in `PollComponent`

- [ ] 8. Extend `PollComponent` with new UI sections
  - [ ] 8.1 Add `isImportant` badge (star icon + "Important" label) in the card header when `poll.is_important` is true
  - [ ] 8.2 Render `<CountdownTimer expiresAt={poll.expires_at} />` below the options when `expires_at` is set and poll is open
  - [ ] 8.3 Render `<NonRespondersPanel>` when `poll.is_important && isCreator`, passing `tripMembers` from `usePollMembers`
  - [ ] 8.4 Accept and wire `onNudge`, `isCreator`, and `tripMembers` props
  - [ ] 8.5 Disable vote submission and show "Poll is closed" message when `poll.is_closed` is true

- [ ] 9. Create nudge API route
  - [ ] 9.1 Create `src/app/api/polls/nudge/route.ts` with a POST handler
  - [ ] 9.2 Authenticate via Supabase SSR; return 401 if no session
  - [ ] 9.3 Verify the caller is the poll creator; return 403 if not
  - [ ] 9.4 Check for a `poll_nudge` notification created within the last hour; return 429 with `retryAfter` if rate-limited
  - [ ] 9.5 Fetch current non-responders and bulk-insert `trip_notifications` rows with `ON CONFLICT DO NOTHING`
  - [ ] 9.6 Return `{ notified: number, retryAfter: null }` on success

- [ ] 10. Add `nudgePoll` mutation to `useTripChat`
  - [ ] 10.1 Add `nudgePollMutation` that POSTs to `/api/polls/nudge` with `{ pollId, tripId }`
  - [ ] 10.2 On success, invalidate `['trip-chat', tripId]` and show a toast with the notified count
  - [ ] 10.3 On 429 response, surface the `retryAfter` time in the `NonRespondersPanel` via `nudge_cooldown_until`

- [ ] 11. Create deadline check API route (cron)
  - [ ] 11.1 Create `src/app/api/polls/check-deadlines/route.ts` with a POST handler protected by `CRON_SECRET` env var
  - [ ] 11.2 Find open polls with `expires_at` within the next 24 hours and insert `poll_deadline_24h` notifications for non-responders
  - [ ] 11.3 Find open polls where `expires_at <= NOW()`, set `is_closed = true`, and insert `poll_overdue` notifications for non-responders
  - [ ] 11.4 Add `CRON_SECRET` to `.env.example` with a comment

- [ ] 12. Wire up notifications display
  - [ ] 12.1 Create `src/hooks/useNotifications.ts` that subscribes to `trip_notifications` for the current user and returns unread count + list
  - [ ] 12.2 Add a notification badge to the TripChat header (or global nav) showing the unread count from `useNotifications`
  - [ ] 12.3 Mark notifications as read when the user opens TripChat for the relevant trip
