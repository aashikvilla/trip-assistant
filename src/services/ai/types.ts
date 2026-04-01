import type { ParsedItinerary, ParsedItineraryDay } from "@/services/itineraryService";

// Re-export for single import point
export type { ParsedItinerary, ParsedItineraryDay };

// ── Stream Events ────────────────────────────────────────────────────────────

export type StreamEvent =
  | { type: "agent_start"; timestamp: string; agentName: string }
  | { type: "agent_thought"; timestamp: string; agentName: string; thought: string }
  | { type: "tool_call"; timestamp: string; toolName: string; input: unknown }
  | { type: "tool_result"; timestamp: string; toolName: string; summary: string; success: boolean }
  | { type: "agent_handoff"; timestamp: string; fromAgent: string; toAgent: string; task: string }
  | { type: "partial_itinerary"; timestamp: string; day: ParsedItineraryDay }
  | { type: "itinerary_complete"; timestamp: string; itinerary: ParsedItinerary }
  | { type: "ai_message"; timestamp: string; content: string }
  | { type: "error"; timestamp: string; message: string; recoverable: boolean };

// ── Emitter ──────────────────────────────────────────────────────────────────

export interface StreamEmitter {
  emit(event: StreamEvent): void;
}

// ── LLM Types ────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class LLMProviderError extends Error {
  constructor(
    public provider: string,
    public statusCode: number,
    public rawBody: string,
  ) {
    super(`LLM provider '${provider}' returned ${statusCode}`);
    this.name = "LLMProviderError";
  }
}

// ── Tool Types ───────────────────────────────────────────────────────────────

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  execute(input: TInput, signal?: AbortSignal): Promise<ToolResult<TOutput>>;
}

// ── Agent Types ──────────────────────────────────────────────────────────────

export interface TripRecommendation {
  id: string;
  tripId: string;
  userId: string;
  recommenderName: string;
  destination: string;
  text: string;
  createdAt: string;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  dayNumber: number;
  timeSlot: string;
  activityName: string;
  description: string;
  isAiGenerated: boolean;
}

export interface Booking {
  id: string;
  type: string;
  startTime: string;
  endTime?: string;
  provider: string;
  price: number;
}

export interface TripContext {
  trip: {
    id: string;
    name: string;
    destinations: string[];
    startDate: string;
    endDate: string;
    tripLengthDays: number;
    travelStyle: string;
    vibe: string;
    budget: "low" | "mid" | "high";
    activityLevel: "light" | "moderate" | "active";
    mustDoActivities: string[];
    description: string;
  };
  members: Array<{
    profileId: string;
    interests: string[];
    dietaryRestrictions: string[];
  }>;
  aggregatedDietary: string[];
  existingItineraryItems: ItineraryItem[];
  bookings: Booking[];
  coTravelerRecommendations: TripRecommendation[];
}

export interface ResearchResult {
  destination: string;
  searchQuery: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

export interface AgentRunContext {
  tripContext: TripContext;
  researchResults?: ResearchResult[];
  existingItinerary?: ParsedItinerary;
  dayNumber?: number;
  reason?: string;
  abortSignal: AbortSignal;
}

export interface AgentResult {
  agentName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  tokenCount?: number;
}

export interface Agent {
  run(context: AgentRunContext, emitter: StreamEmitter): Promise<AgentResult>;
}

// ── Domain Types ─────────────────────────────────────────────────────────────

export interface HotelRecommendation {
  name: string;
  location: string;
  description: string;
  link?: string;
}

export interface TripPlanRequest {
  tripDetails: TripContext["trip"];
  travelers: TripContext["members"];
  globalPreferences: { dietary: string[] };
}

export interface ItineraryOutput {
  hotelRecommendations: HotelRecommendation[];
  itinerary: ParsedItineraryDay[];
  closingNote: string;
}

// ── Custom Errors ────────────────────────────────────────────────────────────

export class TripNotFoundError extends Error {
  constructor(tripId: string) {
    super(`Trip not found: ${tripId}`);
    this.name = "TripNotFoundError";
  }
}

export class ContextTimeoutError extends Error {
  constructor() {
    super("Trip context fetch timed out");
    this.name = "ContextTimeoutError";
  }
}
