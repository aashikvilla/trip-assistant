# Implementation Tasks: PWA Mobile Experience

## Task List

- [ ] 1. Project setup and manifest
  - [ ] 1.1 Install dependencies: `next-pwa`, `idb`, `fast-check` (dev), `web-push`
  - [ ] 1.2 Create `public/manifest.json` with name, short_name, description, start_url, display: standalone, theme_color, background_color, icons (192, 512, maskable)
  - [ ] 1.3 Generate and add PWA icon set to `public/icons/` (192x192, 512x512, maskable-512x512)
  - [ ] 1.4 Update `next.config.ts` to wrap config with `next-pwa` plugin (disable in dev, configure runtimeCaching)
  - [ ] 1.5 Update `src/app/layout.tsx` to add `<link rel="manifest">`, Apple meta tags (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`), and `<meta name="theme-color">`

- [ ] 2. Offline Store (IndexedDB)
  - [ ] 2.1 Create `src/lib/offline-store.ts` — open `vibe-trip-offline` DB with `idb`, define stores: `trips`, `sync-queue`, `install-prompt`
  - [ ] 2.2 Implement `saveOfflineTrip(data: OfflineTripData)`, `getOfflineTrip(tripId)`, `deleteOfflineTrip(tripId)`, `getAllOfflineTrips()`, `calculateStorageSize(tripId)` in `offline-store.ts`
  - [ ] 2.3 Create `src/hooks/useOfflineStore.ts` — React hook wrapping offline store operations with loading/error state
  - [ ] 2.4 Write property tests for offline store round trip (P2) and storage size accuracy (P9)

- [ ] 3. Background Sync queue
  - [ ] 3.1 Create `src/lib/background-sync.ts` — `enqueueAction(action)`, `dequeueAction(id)`, `getPendingActions()`, `markFailed(id)` using the `sync-queue` IndexedDB store
  - [ ] 3.2 Register a `sync` event handler in the Service Worker (via `next-pwa` custom SW) that calls the server for each queued action
  - [ ] 3.3 Write property tests for queue integrity (P3) and failed action retention (P4)

- [ ] 4. Connectivity state management
  - [ ] 4.1 Create `src/lib/connectivity.ts` — state machine with states: `online`, `offline`, `degraded`; listen to `window.online`/`offline` events and implement timeout-based degraded detection
  - [ ] 4.2 Create `src/hooks/useConnectivity.ts` — React hook exposing `{ status, isOnline, isOffline, isDegraded }`
  - [ ] 4.3 Create `src/components/pwa/OfflineBanner.tsx` — persistent banner shown when `isOffline || isDegraded`, with appropriate message per state
  - [ ] 4.4 Add `<OfflineBanner />` to `src/app/layout.tsx`
  - [ ] 4.5 Write property tests for banner state (P7) and connectivity status message accuracy (P13)

- [ ] 5. Install prompt
  - [ ] 5.1 Create `src/components/pwa/InstallPrompt.tsx` — listen for `beforeinstallprompt` event, check 30-day suppression from IndexedDB `install-prompt` store, show custom prompt UI
  - [ ] 5.2 On dismissal, write `{ dismissedAt: Date.now() }` to `install-prompt` store
  - [ ] 5.3 Add `<InstallPrompt />` to `src/app/layout.tsx`
  - [ ] 5.4 Write property test for 30-day suppression logic (P1)

- [ ] 6. Service Worker update notification
  - [ ] 6.1 Create `src/components/pwa/UpdatePrompt.tsx` — listen for SW `waiting` state via `next-pwa`'s `useRegisterSW` hook, show non-blocking toast with "Refresh to update" action
  - [ ] 6.2 Add `<UpdatePrompt />` to `src/app/layout.tsx`

- [ ] 7. Download for offline feature
  - [ ] 7.1 Create `src/components/pwa/DownloadTripButton.tsx` — button that fetches itinerary, bookings, members, expenses, documents for a trip and saves to Offline Store; shows progress indicator during download; shows last-downloaded timestamp and storage size after
  - [ ] 7.2 Create `src/components/pwa/OfflineStorageInfo.tsx` — displays storage size and last-downloaded timestamp for a trip; includes "Remove Offline Data" button
  - [ ] 7.3 Implement low-storage warning: before download, check `navigator.storage.estimate()` and warn if available < 50 MB
  - [ ] 7.4 Integrate `<DownloadTripButton />` and `<OfflineStorageInfo />` into `src/views/TripDetail.tsx`

- [ ] 8. Offline data serving in trip views
  - [ ] 8.1 Update `src/views/TripDetail.tsx` to use `useOfflineStore` — when `isOffline`, read from Offline Store instead of making API calls
  - [ ] 8.2 Update `src/components/trip/TripChat.tsx` to display cached chat history when offline and queue new messages via `background-sync.ts`
  - [ ] 8.3 Show user feedback ("Action queued — will send when online") when a write action is enqueued while offline

- [ ] 9. Offline document viewer
  - [ ] 9.1 Update document download logic in `DownloadTripButton` to also cache document files (PDF/images) in Cache Storage (`trip-documents-v1`)
  - [ ] 9.2 Create an inline document viewer component that renders PDFs via `<iframe>` and images via `<img>` with mobile-friendly sizing
  - [ ] 9.3 Show "Unavailable offline" message for documents not in cache when offline
  - [ ] 9.4 Display file name, type, and size in the documents list
  - [ ] 9.5 Write property test for document list metadata rendering (P12)

- [ ] 10. Push notifications
  - [ ] 10.1 Generate VAPID key pair and add `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` to `.env.local` (and `.env.example`)
  - [ ] 10.2 Create Supabase migration for `push_subscriptions` table
  - [ ] 10.3 Create `src/lib/push-notifications.ts` — `subscribeToPush()`, `unsubscribeFromPush()`, `shouldNotify(userId, tripId, type)`, `updateMutePreferences(tripId, types)`
  - [ ] 10.4 Create `src/app/api/push/subscribe/route.ts` — POST endpoint to store push subscription in Supabase
  - [ ] 10.5 Create `src/app/api/push/unsubscribe/route.ts` — DELETE endpoint to remove subscription
  - [ ] 10.6 Create `src/app/api/push/send/route.ts` — internal POST endpoint that uses `web-push` to send a notification to eligible subscribers
  - [ ] 10.7 Create `src/hooks/usePushNotifications.ts` — hook for requesting permission, subscribing, and managing per-trip mute preferences
  - [ ] 10.8 Add push notification request UI (first-use prompt with explanation) — integrate into onboarding or dashboard
  - [ ] 10.9 Wire chat message creation to call `/api/push/send` for eligible trip members
  - [ ] 10.10 Wire poll creation and poll deadline reminders to call `/api/push/send`
  - [ ] 10.11 Add per-trip notification preference toggles (mute chat / mute polls) to trip settings UI
  - [ ] 10.12 Handle push notification click in Service Worker to navigate to relevant trip/poll URL
  - [ ] 10.13 Write property tests for push eligibility filtering (P10), muted trip suppression (P6), subscription round trip (P5), and permission denial suppression (P11)

- [ ] 11. Mobile-optimized UI
  - [ ] 11.1 Create `src/components/trip/MobileBottomNav.tsx` — bottom navigation bar with tabs: Itinerary, Chat, Polls, Expenses, Bookings, Members; visible only on viewports < 768px
  - [ ] 11.2 Create `src/components/trip/SwipeableTabs.tsx` — wraps tab content with touch swipe detection (using pointer events) to navigate between tabs
  - [ ] 11.3 Integrate `<MobileBottomNav />` and `<SwipeableTabs />` into `src/views/TripDetail.tsx`, replacing the existing tab bar on mobile
  - [ ] 11.4 Create `src/hooks/usePullToRefresh.ts` — detects pull-down gesture on touch devices, triggers a callback, shows loading indicator; displays offline message if `isOffline`
  - [ ] 11.5 Integrate pull-to-refresh into trip content pages
  - [ ] 11.6 Audit all interactive elements in trip views for 44×44px minimum touch target size; add `min-h-11 min-w-11` Tailwind classes where needed
  - [ ] 11.7 Add standalone PWA mode detection (`window.matchMedia('(display-mode: standalone)')`) and render custom in-app back navigation header when in standalone mode
  - [ ] 11.8 Ensure all trip content uses single-column layout on mobile (audit existing grid/flex layouts, add `flex-col` / `grid-cols-1` responsive overrides)

- [ ] 12. Testing
  - [ ] 12.1 Set up `fast-check` in the test suite; configure `fc.configureGlobal({ numRuns: 200 })`
  - [ ] 12.2 Implement all property-based tests (P1–P13) as described in the design document
  - [ ] 12.3 Write unit tests for `offline-store.ts`, `background-sync.ts`, `push-notifications.ts`, `connectivity.ts`
  - [ ] 12.4 Write component tests for `OfflineBanner`, `InstallPrompt`, `DownloadTripButton`, `MobileBottomNav`
