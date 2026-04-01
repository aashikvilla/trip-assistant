# Implementation Plan: AI Itinerary Agent

## Overview

Replace the fire-and-forget POST + polling pattern with a streaming multi-agent pipeline. Tasks are ordered so every dependency is implemented before its consumers: types → providers → tools → agents → endpoints → hooks → UI components → co-traveler feature → cleanup.

## Tasks

- [ ] 1. Core types and interfaces
  - Create `src/services/ai/types.ts` with the full `StreamEvent` discriminated union, `AgentRunContext`, `AgentResult`, `TripContext`, `TripRecommendation`, `TripPlanRequest`, `ItineraryOutput`, `StreamEmitter`, `Agent`, `Tool`, `ToolResult`, `LLMMessage`, `ToolDefinition`, and `LLMProviderError` class
  - Add `ResearchResult` interface (used by ResearchAgent → PlanningAgent handoff)
  - Export `ParsedItinerary` and `ParsedItineraryDay` re-exports from `src/services/itineraryService.ts` so agents import from one place
  - _Requirements: 1.1–1.9, 2.1–2.8, 3.6, 3.7, 6.4_

- [ ] 2. LLM Provider abstraction
  - [ ] 2.1 Define `LLMProvider` interface and `createLLMProvider()` factory in `src/services/ai/providers/index.ts`
    - Factory reads `AI_PROVIDER` env var; defaults to `openrouter` with a console warning when unrecognised
    - _Requirements: 3.1, 3.5_
  - [ ] 2.2 Implement `OpenRouterProvider` in `src/services/ai/providers/openRouterProvider.ts`
    - `streamChat` calls OpenRouter chat completions with streaming; uses `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`
    - Throws `LLMProviderError` on non-2xx HTTP responses
    - _Requirements: 3.2, 3.7_
  - [ ] 2.3 Implement `OllamaProvider` in `src/services/ai/providers/ollamaProvider.ts`
    - Calls Ollama local API at `OLLAMA_BASE_URL` with `OLLAMA_MODEL`; throws `LLMProviderError` on error
    - _Requirements: 3.3, 3.7_
  - [ ] 2.4 Implement `OpenAICompatibleProvider` in `src/services/ai/providers/openAICompatibleProvider.ts`
    - Covers `lmstudio`, `anythingllm`, `openai-compatible`; uses `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
    - _Requirements: 3.4, 3.7_
  - [ ]* 2.5 Write property tests for LLM provider factory
    - **Property 12: LLMProvider factory returns correct type for each AI_PROVIDER value**
    - **Validates: Requirements 3.1, 3.5**
    - File: `src/services/ai/__tests__/providers/factory.test.ts`
  - [ ]* 2.6 Write property tests for LLMProviderError
    - **Property 13: LLMProviderError contains provider name, status code, and raw body**
    - **Validates: Requirements 3.7**
    - File: `src/services/ai/__tests__/providers/factory.test.ts`

- [ ] 3. Tool implementations
  - [ ] 3.1 Implement `WebSearchTool` in `src/services/ai/tools/webSearchTool.ts`
    - Reads `SEARCH_PROVIDER` (`tavily` | `brave`) and corresponding API key
    - Returns up to 10 results with `title`, `url`, `snippet`; 10-second timeout; returns empty array on failure
    - Sanitises queries by stripping email addresses, UUIDs, and phone numbers before sending to external API
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 13.4_
  - [ ]* 3.2 Write property tests for WebSearchTool
    - **Property 14: WebSearchTool results are structurally valid and bounded**
    - **Property 15: WebSearchTool returns empty results on API failure**
    - **Property 16: WebSearchTool strips PII from queries**
    - **Validates: Requirements 4.1, 4.4, 4.6, 13.4**
    - File: `src/services/ai/__tests__/tools/webSearchTool.test.ts`
  - [ ] 3.3 Implement `DBContextTool` in `src/services/ai/tools/dbContextTool.ts`
    - Uses Supabase service-role client; assembles full `TripContext` from `trips`, `trip_members`, `profiles`, `itinerary_items`, `bookings`, `trip_recommendations`
    - 5-second timeout; throws `TripNotFoundError` or `ContextTimeoutError` on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 13.3_
  - [ ]* 3.4 Write property tests for DBContextTool
    - **Property 17: DBContextTool returns complete TripContext**
    - **Property 18: DBContextTool throws TripNotFoundError for missing trips**
    - **Validates: Requirements 5.1, 5.4**
    - File: `src/services/ai/__tests__/tools/dbContextTool.test.ts`

- [ ] 4. Agent implementations
  - [ ] 4.1 Implement `ResearchAgent` in `src/services/ai/agents/researchAgent.ts`
    - Calls `WebSearchTool` at least once per destination; emits `agent_start`, `agent_thought`, `tool_call`, `tool_result` events via `StreamEmitter`
    - Returns `AgentResult` with structured `ResearchResult[]` in `data`
    - _Requirements: 2.2, 4.5, 1.3, 1.4, 1.5_
  - [ ] 4.2 Implement `PlanningAgent` in `src/services/ai/agents/planningAgent.ts`
    - Calls `DBContextTool` first; incorporates research results and co-traveler recommendations in prompt
    - Generates one `ParsedItineraryDay` per calendar day; emits `partial_itinerary` after each day
    - Validates each day against `ParsedItineraryDaySchema` (Zod); retries LLM call up to 2× on validation failure
    - Includes all dietary restrictions and must-do activities in prompt
    - _Requirements: 2.3, 2.4, 2.8, 1.6, 10.2, 10.3, 11.1, 11.4, 12.1, 12.3, 15.7_
  - [ ]* 4.3 Write property tests for PlanningAgent
    - **Property 5: Partial itinerary events match trip day count**
    - **Property 30: Planning_Agent retries on schema validation failure**
    - **Property 31: partial_itinerary events pass schema validation before emission**
    - **Property 34: Planning prompt includes all dietary restrictions**
    - **Property 35: Activities per day are within the required range**
    - **Property 43: Co-traveler recommendations appear in planning prompt**
    - **Validates: Requirements 1.6, 2.8, 10.2, 10.3, 11.1, 12.1, 12.3, 15.7**
    - File: `src/services/ai/__tests__/agents/planningAgent.test.ts`
  - [ ] 4.4 Implement `ReviewAgent` in `src/services/ai/agents/reviewAgent.ts`
    - Feature-flagged via `ENABLE_REVIEW_AGENT=true`; validates completed itinerary against dietary restrictions, budget, must-do activities
    - Flags violations and triggers targeted re-planning for affected days
    - _Requirements: 2.5, 11.2, 11.3_
  - [ ] 4.5 Implement `Orchestrator` in `src/services/ai/orchestrator.ts`
    - Coordinates full pipeline: DBContextTool → ResearchAgent → PlanningAgent → optional ReviewAgent
    - Emits `agent_handoff` at each delegation; persists completed itinerary to Supabase
    - Catches `LLMProviderError`, `TripNotFoundError`, `ContextTimeoutError` and emits stream `error` event
    - Emits structured log entries at each phase transition (job ID, agent name, phase, duration ms, token count)
    - Watchdog: marks jobs stuck in `streaming` for >180s as `failed` with message "Generation timeout"
    - _Requirements: 1.1, 1.2, 1.7, 1.8, 1.9, 2.1, 2.6, 2.7, 6.1, 6.2, 6.3, 14.1, 14.3, 14.5_
  - [ ]* 4.6 Write property tests for Orchestrator
    - **Property 1: SSE opens before agent work begins**
    - **Property 2: Every delegation produces an agent_handoff event**
    - **Property 3: agent_thought events contain required fields**
    - **Property 4: Tool call/result round-trip ordering**
    - **Property 6: itinerary_complete is the terminal event**
    - **Property 7: Errors produce an error event and close the stream**
    - **Property 8: Events are in strictly ascending timestamp order**
    - **Property 9: ResearchAgent calls WebSearchTool at least once per destination**
    - **Property 10: DBContextTool is called before any partial_itinerary event**
    - **Property 11: ReviewAgent handoff precedes itinerary_complete when feature is enabled**
    - **Property 19: Completed itinerary is fully persisted to Supabase**
    - **Property 20: Job status follows valid transition sequence**
    - **Property 22: Failed job record has error_message and completed_at**
    - **Property 37: Structured log entries contain all required fields**
    - **Property 38: Stalled streaming jobs are timed out after 180 seconds**
    - **Validates: Requirements 1.1–1.9, 2.1, 2.5, 6.1–6.3, 6.6, 14.1, 14.5**
    - File: `src/services/ai/__tests__/orchestrator.test.ts`

- [ ] 5. Output parsing utilities
  - Add `prettyPrint(itinerary: ParsedItinerary): string` to `src/services/itineraryService.ts`
  - Add `cleanLLMOutput(raw: string): string` utility (strips markdown fences and leading/trailing whitespace) to `src/services/ai/types.ts` or a new `src/services/ai/utils.ts`
  - Add `ParsedItineraryDaySchema` and `ParsedItinerarySchema` Zod schemas to `src/services/ai/schemas.ts`
  - _Requirements: 10.3, 10.4, 10.5, 10.6_
  - [ ]* 5.1 Write property tests for output parsing
    - **Property 32: ParsedItinerary serialization round-trip**
    - **Property 33: LLM output cleaning removes markdown fences and whitespace**
    - **Property 21: New pipeline output conforms to ParsedItinerary interface**
    - **Validates: Requirements 10.4, 10.5, 10.6, 6.4**
    - File: `src/services/ai/__tests__/types.test.ts`

- [ ] 6. Checkpoint — core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. SSE streaming endpoint
  - Replace `src/app/api/ai/generate-itinerary/route.ts` with a new `GET` handler at `src/app/api/ai/generate-itinerary/stream/route.ts`
    - Verifies trip membership (returns 403 if not a member, 404 if trip not found, 400 if missing tripId)
    - Creates job record (`pending`), opens `ReadableStream`, returns `Content-Type: text/event-stream` immediately
    - Instantiates `Orchestrator` with stream emitter and `AbortController`; updates job to `streaming`
    - Each `StreamEvent` is serialized as `data: <JSON>\n\n`
    - _Requirements: 1.1, 6.3, 13.1, 13.5_
  - [ ]* 7.1 Write property tests for SSE endpoint
    - **Property 36: Endpoints return 403 for non-members**
    - **Property 25: Partial replan returns 400 for non-existent day numbers** (tested here for the stream endpoint's 400 path)
    - **Validates: Requirements 13.1, 13.2**
    - File: `src/services/ai/__tests__/orchestrator.test.ts`

- [ ] 8. @AI chat endpoint
  - Create `src/app/api/ai/chat/route.ts` (POST handler)
    - Verifies trip membership; loads `TripContext` via `DBContextTool`
    - Builds message history (last 10 `@AI` exchanges from `trip_messages`)
    - Streams response as SSE using same `StreamEvent` protocol; emits `ai_message` as final event
    - Persists completed AI response to `trip_messages` with `message_type = 'ai_response'`
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7, 8.8, 13.2_
  - [ ]* 8.1 Write property tests for @AI chat endpoint
    - **Property 26: @AI prefix routing is case-insensitive**
    - **Property 27: AI chat history window is bounded to 10 exchanges**
    - **Property 28: AI chat responses are persisted with ai_response message type**
    - **Validates: Requirements 8.1, 8.6, 8.8**
    - File: `src/services/ai/__tests__/orchestrator.test.ts`

- [ ] 9. Partial replan endpoint
  - Create `src/app/api/ai/replan/route.ts` (POST handler)
    - Accepts `{ tripId, dayNumber, reason? }`; verifies membership; returns 400 if `dayNumber` not in current itinerary
    - Streams replanned day using same SSE protocol; emits exactly one `partial_itinerary` for the target day
    - Updates only the `itinerary_items` rows for the replanned day; leaves all other days unchanged
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 13.1_
  - [ ]* 9.1 Write property tests for partial replan endpoint
    - **Property 23: Partial replan emits exactly one partial_itinerary for the target day**
    - **Property 24: Partial replan only modifies target day's itinerary_items rows**
    - **Property 25: Partial replan returns 400 for non-existent day numbers**
    - **Validates: Requirements 7.1, 7.3, 7.5**
    - File: `src/services/ai/__tests__/orchestrator.test.ts`

- [ ] 10. Checkpoint — all endpoints complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. `useItineraryStream` hook
  - Create `src/hooks/useItineraryStream.ts`
    - Opens `EventSource` to `/api/ai/generate-itinerary/stream?tripId=...`
    - Exposes: `events: StreamEvent[]`, `status: 'idle' | 'streaming' | 'complete' | 'error'`, `itinerary: ParsedItinerary | null`, `cancel(): void`
    - `cancel()` closes the `EventSource` and PATCHes the job to `cancelled` via Supabase client
    - Accumulates `partial_itinerary` events into a live `itinerary` preview
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - [ ]* 11.1 Write property tests for useItineraryStream
    - **Property 29: Cancel transitions job to cancelled status**
    - **Validates: Requirements 9.5, 14.3**
    - File: `src/hooks/__tests__/useItineraryStream.test.ts`

- [ ] 12. UI components
  - [ ] 12.1 Implement `StreamingThinkingPanel` in `src/components/itinerary/StreamingThinkingPanel.tsx`
    - Displays current agent name and latest `agent_thought` text; collapsible timeline log of all past thoughts
    - Animates between successive thoughts; collapses automatically on `itinerary_complete`
    - _Requirements: 9.2_
  - [ ] 12.2 Implement `PartialDayCard` in `src/components/itinerary/PartialDayCard.tsx`
    - Renders a single `partial_itinerary` event payload as a day card alongside `StreamingThinkingPanel`
    - _Requirements: 9.3_
  - [ ] 12.3 Wire `useItineraryStream`, `StreamingThinkingPanel`, and `PartialDayCard` into the trip detail page (`src/app/trips/[id]/page.tsx` or the relevant itinerary section component)
    - On `itinerary_complete`, collapse thinking panel and transition to `AIItineraryDisplay`
    - _Requirements: 9.4, 9.6_

- [ ] 13. Database migration for `trip_recommendations`
  - Create migration file `supabase/migrations/<timestamp>_add_trip_recommendations.sql`
    - Creates `trip_recommendations` table with RLS policies as specified in the design
    - Adds `streaming` and `cancelled` to `itinerary_generation_jobs` status check constraint
    - _Requirements: 15.1, 6.3_

- [ ] 14. Co-traveler recommendations feature
  - [ ] 14.1 Implement `RecommendationService` in `src/services/recommendations/recommendationService.ts`
    - `getForTrip(tripId, userId)`: queries `trip_recommendations` joined with co-traveler relationship; returns at most 3 results ranked by destination trip count desc, then total trip count desc; filters to co-travelers only
    - `saveRecommendation(input)`: inserts a row into `trip_recommendations`
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.9_
  - [ ]* 14.2 Write property tests for RecommendationService
    - **Property 39: Co-traveler relationship is symmetric**
    - **Property 40: Recommendations use exact destination matching and co-traveler filtering**
    - **Property 41: At most 3 recommendations are surfaced, in correct ranking order**
    - **Property 42: Every surfaced recommendation has a non-empty attribution**
    - **Validates: Requirements 15.2, 15.3, 15.4, 15.5, 15.6, 15.9**
    - File: `src/services/recommendations/__tests__/recommendationService.test.ts`
  - [ ] 14.3 Create `GET /api/recommendations` route in `src/app/api/recommendations/route.ts`
    - Accepts `?tripId=...`; verifies membership; returns ranked `TripRecommendation[]`
    - _Requirements: 15.3, 13.1_
  - [ ] 14.4 Implement `useCoTravelerRecommendations` hook in `src/hooks/useCoTravelerRecommendations.ts`
    - React Query wrapper around `GET /api/recommendations?tripId=...`; returns ranked `TripRecommendation[]`
    - _Requirements: 15.3, 15.4_
  - [ ] 14.5 Implement `TripRecommendationPrompt` component in `src/components/trip/TripRecommendationPrompt.tsx`
    - Post-trip modal shown when trip end date has passed and user hasn't submitted recommendations yet
    - Allows up to 3 free-form text recommendations tied to the trip's destination
    - Attributed display: "Your co-traveler [Name] recommends: ..."
    - _Requirements: 15.1, 15.6, 15.8_

- [ ] 15. Checkpoint — co-traveler feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Cleanup — remove legacy N8N code
  - [ ] 16.1 Remove the old fire-and-forget POST handler from `src/app/api/ai/generate-itinerary/route.ts` (replace with a redirect or 410 Gone response pointing to the new stream endpoint)
    - _Requirements: 9.6_
  - [ ] 16.2 Delete `src/types/n8n.ts` and update all imports to use the new types from `src/services/ai/types.ts`
    - Update `src/services/ai/promptBuilder.ts`, `src/types/itinerary.ts`, and any other files that import from `src/types/n8n.ts`
    - _Requirements: 6.4_
  - [ ] 16.3 Remove the old polling status endpoint `src/app/api/ai/status/[jobId]/route.ts` only after confirming `useItineraryStream` handles reconnection via the same path; keep the route if it is still used as a reconnection fallback
    - _Requirements: 9.6, 14.4_

- [ ] 17. Final checkpoint — full pipeline end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** with `numRuns: 100` minimum; each test must include the comment `// Feature: ai-itinerary-agent, Property N: <property_text>`
- `ParsedItinerary` and `ParsedItineraryDay` in `src/services/itineraryService.ts` are intentionally left unchanged to preserve `AIItineraryDisplay` compatibility
- The old `useItineraryGeneration` and `useItineraryStatus` hooks remain functional during migration; remove only after `useItineraryStream` is fully wired
- All LLM provider API keys must use server-only env vars (no `NEXT_PUBLIC_` prefix)
