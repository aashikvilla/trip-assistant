# Requirements Document

## Introduction

This document defines requirements for the AI Itinerary Agent — a complete rewrite of Vibe Trip's itinerary generation system. The current system uses a fire-and-forget job polling pattern with a single monolithic prompt. The new system replaces this with a streaming multi-agent pipeline, a configurable LLM backend, real-time web search, and an `@AI` chat assistant embedded in the trip chat. Users will see the AI's reasoning and progress in real-time before the final itinerary arrives, and can ask follow-up questions or request partial replanning without regenerating the entire trip.

---

## Glossary

- **Orchestrator**: The top-level agent that decomposes a trip planning request into sub-tasks and coordinates the Research Agent and Planning Agent.
- **Research_Agent**: A focused agent responsible for gathering real-time destination information using web search tools.
- **Planning_Agent**: A focused agent responsible for constructing the day-by-day itinerary from research results and trip context.
- **Review_Agent**: An optional agent that validates the completed itinerary against trip constraints before finalisation.
- **AI_Chat_Assistant**: The conversational AI accessible via `@AI` mentions in the trip chat, capable of answering questions and performing partial replanning.
- **Stream**: A Server-Sent Events (SSE) or ReadableStream HTTP response that delivers incremental events to the client.
- **Stream_Event**: A discrete JSON payload emitted on the stream, typed as one of: `agent_start`, `agent_thought`, `tool_call`, `tool_result`, `agent_handoff`, `partial_itinerary`, `itinerary_complete`, `error`.
- **LLM_Provider**: A configurable backend that executes language model inference. Supported providers: OpenRouter, Ollama, LM Studio, AnythingLLM.
- **Web_Search_Tool**: An agent-callable tool that queries a search API (Tavily or Brave Search) and returns structured results.
- **DB_Context_Tool**: An agent-callable tool that reads trip data, member preferences, past itineraries, and bookings from Supabase.
- **Partial_Replan**: An operation that regenerates the itinerary for one or more specific days without affecting other days.
- **Trip_Context**: The full set of data relevant to a trip: trip metadata, member profiles, preferences, dietary restrictions, existing itinerary items, bookings, and budget.
- **Job**: A record in `itinerary_generation_jobs` tracking the lifecycle of a generation request.
- **@AI_Mention**: A chat message prefixed with `@AI` that routes to the AI_Chat_Assistant instead of being broadcast to other members.
- **ParsedItinerary**: The structured itinerary object consumed by `AIItineraryDisplay` and calendar components.

---

## Requirements

### Requirement 1: Streaming Multi-Agent Pipeline

**User Story:** As a trip member, I want to watch the AI think through my trip in real-time, so that I know it is working and can see the reasoning behind the itinerary.

#### Acceptance Criteria

1. WHEN a user triggers itinerary generation, THE Orchestrator SHALL open a streaming HTTP response using Server-Sent Events before any agent begins work.
2. WHEN the Orchestrator delegates a task to the Research_Agent or Planning_Agent, THE Stream SHALL emit an `agent_handoff` event containing the receiving agent's name and its assigned task description.
3. WHEN an agent produces an intermediate reasoning step, THE Stream SHALL emit an `agent_thought` event containing the agent name and a brief, human-readable thought text (e.g. "Researching top attractions in Kyoto...", "Checking dietary restrictions for the group...", "Scheduling must-do activities first...") within 500ms of the step being produced.
4. WHEN an agent invokes a tool, THE Stream SHALL emit a `tool_call` event containing the tool name and input parameters before the tool executes.
5. WHEN a tool returns a result, THE Stream SHALL emit a `tool_result` event containing the tool name and a summary of the result.
6. WHEN the Planning_Agent completes a day's plan, THE Stream SHALL emit a `partial_itinerary` event containing the completed day's structured data.
7. WHEN all agents have completed their work, THE Stream SHALL emit an `itinerary_complete` event containing the full ParsedItinerary and then close the connection.
8. IF any agent encounters an unrecoverable error, THEN THE Stream SHALL emit an `error` event with a human-readable message and close the connection.
9. THE Stream SHALL emit events in strictly ascending timestamp order with no out-of-order delivery.
10. THE Orchestrator SHALL complete the full pipeline and emit `itinerary_complete` within 120 seconds of stream open for trips up to 14 days.

---

### Requirement 2: Multi-Agent Architecture

**User Story:** As a developer, I want focused single-responsibility agents, so that the system is easy to extend, debug, and swap out individual agents.

#### Acceptance Criteria

1. THE Orchestrator SHALL decompose every generation request into at minimum a research phase and a planning phase before delegating to sub-agents.
2. THE Research_Agent SHALL use the Web_Search_Tool to gather destination-specific information including current events, weather patterns, local tips, and attraction operating hours.
3. THE Planning_Agent SHALL use the DB_Context_Tool to read Trip_Context before constructing any itinerary day.
4. THE Planning_Agent SHALL incorporate all research results from the Research_Agent when constructing the itinerary.
5. WHERE the Review_Agent feature is enabled, THE Review_Agent SHALL validate the completed itinerary against all dietary restrictions, budget constraints, and must-do activities before the `itinerary_complete` event is emitted.
6. THE Orchestrator SHALL pass the full Trip_Context to each sub-agent at the time of delegation.
7. WHEN a new agent type is added to the codebase, THE Orchestrator SHALL be able to incorporate it without modifying existing agent implementations.
8. THE Planning_Agent SHALL produce one itinerary day per calendar day of the trip with no gaps and no duplicate day numbers.

---

### Requirement 3: Configurable LLM Backend

**User Story:** As a developer or self-hoster, I want to swap the LLM provider via environment variables, so that I can use OpenRouter, Ollama, LM Studio, or any OpenAI-compatible API without code changes.

#### Acceptance Criteria

1. THE LLM_Provider SHALL be selected at runtime based on the `AI_PROVIDER` environment variable, accepting values: `openrouter`, `ollama`, `lmstudio`, `anythingllm`, `openai-compatible`.
2. WHEN `AI_PROVIDER` is `openrouter`, THE LLM_Provider SHALL call the OpenRouter chat completions API using `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
3. WHEN `AI_PROVIDER` is `ollama`, THE LLM_Provider SHALL call the Ollama local API at the base URL specified by `OLLAMA_BASE_URL` using the model specified by `OLLAMA_MODEL`.
4. WHEN `AI_PROVIDER` is `lmstudio` or `anythingllm`, THE LLM_Provider SHALL call the OpenAI-compatible endpoint at `LLM_BASE_URL` using `LLM_API_KEY` and `LLM_MODEL`.
5. IF `AI_PROVIDER` is not set or is unrecognised, THEN THE LLM_Provider SHALL default to `openrouter` and log a warning at startup.
6. THE LLM_Provider interface SHALL expose a single `streamChat(messages, tools) → AsyncIterable<token>` method so that agents are decoupled from provider-specific SDKs.
7. WHEN the configured LLM_Provider returns an HTTP error, THE LLM_Provider SHALL throw a typed `LLMProviderError` containing the provider name, status code, and raw error body.

---

### Requirement 4: Web Search Tool

**User Story:** As a trip planner, I want the AI to look up current information about my destination, so that the itinerary reflects real operating hours, recent reviews, and current events.

#### Acceptance Criteria

1. THE Web_Search_Tool SHALL accept a natural-language query string and return up to 10 structured results each containing: title, URL, and a text snippet.
2. WHEN `SEARCH_PROVIDER` is `tavily`, THE Web_Search_Tool SHALL call the Tavily Search API using `TAVILY_API_KEY`.
3. WHEN `SEARCH_PROVIDER` is `brave`, THE Web_Search_Tool SHALL call the Brave Search API using `BRAVE_SEARCH_API_KEY`.
4. IF the search API returns an error or times out after 10 seconds, THEN THE Web_Search_Tool SHALL return an empty result set and emit a `tool_result` stream event indicating the failure reason.
5. THE Research_Agent SHALL perform at minimum one Web_Search_Tool call per destination in the trip before handing off to the Planning_Agent.
6. THE Web_Search_Tool SHALL sanitise all query strings by removing personally identifiable information before sending to the external search API.

---

### Requirement 5: Database Context Tool

**User Story:** As a trip planner, I want the AI to know everything about my trip and group, so that the itinerary is personalised to our preferences, dietary needs, and past trips.

#### Acceptance Criteria

1. THE DB_Context_Tool SHALL read the following data for a given trip ID: trip metadata, all accepted member profiles and preferences, aggregated dietary restrictions, existing itinerary items, bookings, and budget.
2. THE DB_Context_Tool SHALL use the Supabase service-role client so that Row Level Security does not block agent reads.
3. THE DB_Context_Tool SHALL return a typed `TripContext` object and SHALL NOT expose raw SQL or Supabase query objects to agents.
4. IF a trip ID does not exist in the database, THEN THE DB_Context_Tool SHALL throw a `TripNotFoundError` that the Orchestrator catches and converts to a stream `error` event.
5. THE DB_Context_Tool SHALL complete its read within 5 seconds; IF the read exceeds 5 seconds, THEN THE DB_Context_Tool SHALL throw a `ContextTimeoutError`.

---

### Requirement 6: Itinerary Persistence and Backward Compatibility

**User Story:** As a developer, I want the new agent output to be stored in the same Supabase schema and consumed by existing display components, so that I don't have to rewrite the calendar and itinerary views.

#### Acceptance Criteria

1. WHEN the `itinerary_complete` event is received by the server, THE System SHALL persist itinerary days as rows in `itinerary_items` using the same column schema as the current implementation.
2. THE System SHALL update the `trips` table columns `ai_itinerary_data`, `hotel_recommendations`, `itinerary_status`, and `itinerary_generated_at` upon successful completion, matching the current field contract.
3. THE System SHALL record a row in `itinerary_generation_jobs` with status transitions: `pending` → `streaming` → `completed` or `failed`. This record serves as an audit trail and reconnection fallback; it is NOT the primary progress mechanism (SSE streaming is).
4. THE `AIItineraryDisplay` component SHALL render itineraries produced by the new agent pipeline without modification to its props interface.
5. THE `ItineraryStatusNotification` component SHALL continue to function by subscribing to Supabase Realtime on `itinerary_generation_jobs` for the current trip.
6. WHEN a generation job fails, THE System SHALL set `itinerary_generation_jobs.status` to `failed` and populate `error_message` so that existing retry and clear hooks continue to work.

---

### Requirement 7: Partial Replan (Single-Day Regeneration)

**User Story:** As a trip member, I want to replan a single day without regenerating the whole trip, so that I can quickly adapt when a venue is closed or plans change.

#### Acceptance Criteria

1. WHEN a partial replan is requested for a specific day number, THE System SHALL stream a new plan for only that day using the same streaming event protocol as full generation.
2. THE Planning_Agent SHALL receive the existing itinerary for all other days as context when performing a Partial_Replan, so that the new day fits coherently within the overall trip.
3. WHEN a Partial_Replan completes, THE System SHALL update only the `itinerary_items` rows for the replanned day, leaving all other days unchanged.
4. THE System SHALL accept an optional `reason` string with a Partial_Replan request (e.g. "museum is closed", "it's raining") and THE Planning_Agent SHALL incorporate the reason into its planning.
5. IF a Partial_Replan is requested for a day number that does not exist in the current itinerary, THEN THE System SHALL return a 400 error with a descriptive message.

---

### Requirement 8: @AI Chat Assistant

**User Story:** As a trip member, I want to type `@AI` in the trip chat to ask questions about the itinerary or request changes, so that I can get instant AI help without leaving the chat.

#### Acceptance Criteria

1. WHEN a chat message begins with the prefix `@AI` (case-insensitive), THE TripChat component SHALL route the message to the AI_Chat_Assistant endpoint instead of broadcasting it to other members.
2. THE AI_Chat_Assistant SHALL load the full Trip_Context for the trip before generating a response.
3. THE AI_Chat_Assistant SHALL stream its response back into the chat as a special AI message type, displaying tokens as they arrive.
4. THE AI_Chat_Assistant SHALL be capable of answering questions about the current itinerary, suggesting alternatives, identifying potential issues, and initiating a Partial_Replan.
5. WHEN the AI_Chat_Assistant initiates a Partial_Replan in response to a chat message, THE System SHALL stream the replan progress into the chat thread as a series of `agent_thought` and `partial_itinerary` events rendered inline.
6. THE AI_Chat_Assistant SHALL maintain conversational context for the duration of a chat session by including the last 10 `@AI` exchanges in its message history.
7. IF the AI_Chat_Assistant cannot fulfil a request (e.g. no itinerary exists yet), THEN THE AI_Chat_Assistant SHALL respond with a clear explanation of what is needed.
8. THE AI_Chat_Assistant response SHALL be stored in the `trip_messages` table with `message_type` set to `ai_response` so that it persists across page reloads.

---

### Requirement 9: Streaming Client Integration

**User Story:** As a trip member, I want to see a live progress panel while the itinerary is being generated, so that I understand what the AI is doing and feel confident it hasn't stalled.

#### Acceptance Criteria

1. THE System SHALL expose a React hook `useItineraryStream` that opens an SSE connection to the generation endpoint and exposes: `events: StreamEvent[]`, `status: 'idle' | 'streaming' | 'complete' | 'error'`, `itinerary: ParsedItinerary | null`, and `cancel: () => void`.
2. WHEN the stream emits an `agent_thought` event, THE UI SHALL display the thought text in a dedicated "AI is thinking..." panel within 200ms of receipt. The panel SHALL show: the current agent name, the latest thought text, and a collapsible timeline log of all past thoughts. The panel SHALL animate between successive thoughts to convey active progress rather than a static spinner.
3. WHEN the stream emits a `partial_itinerary` event, THE UI SHALL render the completed day card immediately alongside the thinking panel, before the full itinerary arrives.
4. WHEN the stream emits `itinerary_complete`, THE UI SHALL collapse the thinking panel and transition to the full `AIItineraryDisplay` component.
5. WHEN the user cancels an in-progress generation, THE `useItineraryStream` hook SHALL close the SSE connection and THE System SHALL mark the job as `cancelled` in the database.
6. THE `useItineraryStream` hook SHALL replace the existing `useItineraryGeneration` and `useItineraryStatus` hooks as the primary generation interface, while keeping the old hooks functional for backward compatibility during migration.

---

### Requirement 10: Agent Prompt and Output Parsing

**User Story:** As a developer, I want each agent to have a well-defined prompt contract and validated output, so that malformed LLM responses are caught early and don't corrupt the database.

#### Acceptance Criteria

1. THE Orchestrator SHALL use a structured system prompt that defines its role, available agents, tool schemas, and output format.
2. THE Planning_Agent SHALL produce output conforming to the `ParsedItinerary` JSON schema; IF the output does not conform, THEN THE Planning_Agent SHALL retry the LLM call up to 2 times before emitting a stream `error` event.
3. THE System SHALL validate every `partial_itinerary` stream event payload against the `ParsedItineraryDay` schema before emitting it to the client.
4. THE Pretty_Printer SHALL serialise any `ParsedItinerary` object back to a canonical JSON string.
5. FOR ALL valid `ParsedItinerary` objects, parsing the Pretty_Printer output SHALL produce an equivalent `ParsedItinerary` object (round-trip property).
6. THE System SHALL strip markdown code fences and leading/trailing whitespace from all LLM text outputs before attempting JSON parsing.

---

### Requirement 11: Dietary and Constraint Compliance

**User Story:** As a trip member with dietary restrictions, I want every food suggestion in the itinerary to respect my restrictions, so that I don't have to manually filter out unsuitable recommendations.

#### Acceptance Criteria

1. THE Planning_Agent SHALL include all aggregated dietary restrictions from Trip_Context in its planning prompt.
2. WHEN the itinerary is complete, FOR ALL food suggestions in the itinerary, each suggestion SHALL be compatible with at least one of the following: no dietary restriction applies, or the suggestion explicitly accommodates all active dietary restrictions.
3. WHERE the Review_Agent is enabled, THE Review_Agent SHALL flag any food suggestion that conflicts with a known dietary restriction and THE Planning_Agent SHALL replace the flagged suggestion before `itinerary_complete` is emitted.
4. THE Planning_Agent SHALL include must-do activities from Trip_Context in the itinerary; IF a must-do activity cannot be scheduled on any day, THEN THE Planning_Agent SHALL include a note in `closing_note` explaining why.

---

### Requirement 12: Itinerary Coverage

**User Story:** As a trip planner, I want the generated itinerary to cover every day of the trip, so that no day is left unplanned.

#### Acceptance Criteria

1. THE Planning_Agent SHALL generate exactly one `ParsedItineraryDay` per calendar day of the trip, where the number of days equals `(end_date - start_date) + 1`.
2. THE System SHALL validate that the set of `day_number` values in the completed itinerary equals `{1, 2, ..., N}` where N is the trip length in days; IF any day is missing, THEN THE System SHALL emit a stream `error` event.
3. THE Planning_Agent SHALL generate between 3 and 6 activities per day.
4. WHEN a trip spans multiple destinations, THE Planning_Agent SHALL assign each destination to a contiguous block of days and SHALL include travel logistics between destinations.

---

### Requirement 13: Security and Access Control

**User Story:** As a trip member, I want only authorised members to trigger AI generation and access AI responses for my trip, so that private trip data is not exposed.

#### Acceptance Criteria

1. THE generation endpoint SHALL verify that the requesting user is an accepted member of the trip before starting the agent pipeline; IF the user is not a member, THEN THE System SHALL return a 403 response.
2. THE AI_Chat_Assistant endpoint SHALL verify trip membership before loading Trip_Context or generating a response.
3. THE DB_Context_Tool SHALL use the service-role Supabase client exclusively on the server; THE System SHALL never expose the service-role key to the client.
4. THE Web_Search_Tool SHALL never include raw trip member data (names, emails, profile IDs) in search queries sent to external APIs.
5. THE LLM_Provider API keys (`OPENROUTER_API_KEY`, `OLLAMA_BASE_URL`, `TAVILY_API_KEY`, etc.) SHALL be server-only environment variables with no `NEXT_PUBLIC_` prefix.

---

### Requirement 14: Observability and Error Recovery

**User Story:** As a developer, I want structured logs and reliable error states, so that I can diagnose failures and users can recover without manual database intervention.

#### Acceptance Criteria

1. THE Orchestrator SHALL emit a structured log entry at each phase transition (agent start, tool call, agent complete, pipeline complete) containing: job ID, agent name, phase, duration in milliseconds, and token count where available.
2. WHEN a generation job fails, THE System SHALL set `itinerary_generation_jobs.status` to `failed`, populate `error_message`, and set `completed_at` so that the existing `useItineraryJobManagement` retry and clear hooks function without modification.
3. THE System SHALL support cancellation: WHEN a cancel request is received for an active job, THE Orchestrator SHALL abort the current LLM call, close the stream, and update the job status to `cancelled` within 2 seconds.
4. IF the SSE connection drops while a job is in progress, THEN THE System SHALL continue processing in the background and THE client SHALL be able to check whether generation completed by polling the `/api/ai/status/[jobId]` endpoint as a reconnection fallback (not as the primary status mechanism).
5. THE System SHALL not leave any job in `streaming` status for more than 180 seconds; IF a job exceeds this threshold, THEN THE System SHALL automatically mark it as `failed` with message "Generation timeout".

---

### Requirement 15: Co-Traveler Recommendations

**User Story:** As a trip planner, I want to see recommendations from people I've traveled with before when planning a trip to a destination they've visited, so that I benefit from trusted first-hand advice rather than generic suggestions.

#### Acceptance Criteria

1. WHEN a user completes a trip, THE System SHALL prompt each accepted trip member to leave up to 3 free-form text recommendations tied to the trip's destination (e.g. "Best ramen spot near Shinjuku station", "Skip the tourist trap at X, go to Y instead").
2. THE System SHALL define two users as co-travelers IF they have both been accepted members of the same trip at any point in time.
3. WHEN a user begins planning a new trip to destination X, THE System SHALL query for co-traveler recommendations where the recommendation's destination exactly matches destination X.
4. THE System SHALL surface at most 3 recommendations per planning session, ranked by: (1) the recommending co-traveler's number of trips to that exact destination (descending), then (2) the recommending co-traveler's total number of trips overall as a tiebreaker.
5. THE System SHALL only surface recommendations from co-travelers; IF no co-traveler has a recommendation for destination X, THEN THE System SHALL surface no recommendations.
6. EACH recommendation displayed to the user SHALL be attributed with the co-traveler's display name in the format: "Your co-traveler [Name] recommends: ...".
7. WHEN co-traveler recommendations exist for the trip destination, THE Planning_Agent SHALL receive those recommendations as additional context in its planning prompt so that it can incorporate or reference them in the itinerary.
8. THE UI SHALL render co-traveler recommendations in a distinct "From your travel network" section, visually separate from AI-generated itinerary content.
9. IF a user who left a recommendation is no longer a co-traveler of the planning user (i.e. they have never shared a trip), THEN THE System SHALL not surface that recommendation.

#### Correctness Properties

- FOR ALL recommendation sets surfaced to a user, the count SHALL be at most 3 (never-exceed-3 invariant).
- FOR ALL recommendations surfaced to user A, the recommending user SHALL be a co-traveler of user A at the time of surfacing (co-traveler-only invariant).
- FOR ALL recommendations surfaced for destination X, the recommendation's stored destination SHALL exactly equal X with no partial or fuzzy matching (exact-destination invariant).
- FOR ALL recommendations surfaced, the attribution field SHALL be non-empty and SHALL reference the recommending user's display name (always-attributed invariant).
- FOR ALL users with no co-travelers who have visited destination X, the surfaced recommendation set SHALL be empty (empty-set invariant).
- WHEN the same co-traveler has multiple recommendations for destination X, THE System SHALL include at most the top-ranked recommendation from that co-traveler in the surfaced set (one-per-co-traveler property).
