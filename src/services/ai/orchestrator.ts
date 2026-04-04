import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import type { LLMProvider } from "./providers";
import type { StreamEmitter, TripContext, ParsedItinerary } from "./types";
import { LLMProviderError, TripNotFoundError, ContextTimeoutError } from "./types";
import { DBContextTool } from "./tools/dbContextTool";
import { ResearchAgent } from "./agents/researchAgent";
import { PlanningAgent } from "./agents/planningAgent";
import { ReviewAgent } from "./agents/reviewAgent";
import { now } from "./utils";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export class Orchestrator {
  private dbContextTool = new DBContextTool();
  private researchAgent = new ResearchAgent();
  private planningAgent = new PlanningAgent();
  private reviewAgent = new ReviewAgent();

  constructor(
    private provider: LLMProvider,
    private emitter: StreamEmitter,
    private abortController: AbortController,
  ) {}

  async run(tripId: string, jobId: string): Promise<void> {
    const supabase = getServiceClient();
    const { signal } = this.abortController;

    // Install watchdog — mark jobs stuck in 'streaming' after 5 min as failed
    const watchdogTimer = setTimeout(async () => {
      await supabase
        .from("itinerary_generation_jobs")
        .update({ status: "failed", error_message: "Generation timeout", completed_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "streaming");
      this.abortController.abort();
    }, 300_000);

    const runStart = Date.now();
    try {
      // 1. Load trip context
      emitLog("Orchestrator", "Loading trip context...", this.emitter);
      const phaseStart = Date.now();

      const contextResult = await this.dbContextTool.execute({ tripId }, signal);
      if (!contextResult.success || !contextResult.data) {
        throw new Error(contextResult.error ?? "Failed to load trip context");
      }
      const tripContext: TripContext = contextResult.data;
      console.info("[Orchestrator]", { phase: "context", jobId, tripId, durationMs: Date.now() - phaseStart, destinations: tripContext.trip.destinations });

      // 2. Research phase
      this.emitter.emit({
        type: "agent_handoff",
        timestamp: now(),
        fromAgent: "Orchestrator",
        toAgent: "ResearchAgent",
        task: `Research destinations: ${tripContext.trip.destinations.join(", ")}`,
      });

      const researchStart = Date.now();
      const researchResult = await this.researchAgent.run(
        { tripContext, abortSignal: signal },
        this.emitter,
      );
      console.info("[Orchestrator]", { phase: "research", jobId, tripId, durationMs: Date.now() - researchStart, success: researchResult.success });

      if (signal.aborted) return;

      // 3. Planning phase
      this.emitter.emit({
        type: "agent_handoff",
        timestamp: now(),
        fromAgent: "Orchestrator",
        toAgent: "PlanningAgent",
        task: `Plan ${tripContext.trip.tripLengthDays}-day itinerary`,
      });

      const planningStart = Date.now();
      const planningResult = await this.planningAgent.run(
        {
          tripContext,
          researchResults: researchResult.success
            ? (researchResult.data as Parameters<typeof this.planningAgent.run>[0]["researchResults"])
            : [],
          abortSignal: signal,
        },
        this.emitter,
      );
      console.info("[Orchestrator]", { phase: "planning", jobId, tripId, durationMs: Date.now() - planningStart, success: planningResult.success });

      const itinerary = planningResult.data as ParsedItinerary;

      // 4. Optional review phase (skip if aborted — always persist what we have)
      if (!signal.aborted && process.env.ENABLE_REVIEW_AGENT === "true") {
        this.emitter.emit({
          type: "agent_handoff",
          timestamp: now(),
          fromAgent: "Orchestrator",
          toAgent: "ReviewAgent",
          task: "Validate itinerary constraints",
        });

        await this.reviewAgent.run(
          { tripContext, existingItinerary: itinerary, abortSignal: signal },
          this.emitter,
        );
      }

      // 5. Always persist whatever days were generated (even if aborted mid-way)
      if (itinerary.days.length === 0) {
        throw new Error("No itinerary days were generated — all LLM calls failed");
      }
      emitLog("Orchestrator", "Persisting itinerary to database...", this.emitter);
      await this.persistItinerary(tripId, jobId, itinerary, tripContext.trip.createdBy, supabase);

      // 6. Emit completion
      this.emitter.emit({
        type: "itinerary_complete",
        timestamp: now(),
        itinerary,
      });

      console.info("[Orchestrator]", { phase: "complete", jobId, tripId, totalDurationMs: Date.now() - runStart, daysGenerated: itinerary.days.length });
      clearTimeout(watchdogTimer);
    } catch (err) {
      clearTimeout(watchdogTimer);

      const message = err instanceof Error ? err.message : "Unknown error";

      // All orchestrator-level errors are non-recoverable — the stream is done
      this.emitter.emit({
        type: "error",
        timestamp: now(),
        message,
        recoverable: false,
      });

      const isLLMError = err instanceof LLMProviderError;
      const isContextError = err instanceof TripNotFoundError || err instanceof ContextTimeoutError;

      console.error(`[Orchestrator] Error for job ${jobId}:`, {
        type: isLLMError ? "LLMProviderError" : isContextError ? "ContextError" : "UnknownError",
        message,
      });

      await supabase
        .from("itinerary_generation_jobs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      await supabase
        .from("trips")
        .update({ itinerary_status: "failed", itinerary_generated_at: new Date().toISOString() })
        .eq("id", tripId);
    }
  }

  private async persistItinerary(
    tripId: string,
    jobId: string,
    itinerary: ParsedItinerary,
    createdBy: string,
    supabase: ReturnType<typeof getServiceClient>,
  ): Promise<void> {
    // Delete old AI-generated items
    await supabase
      .from("itinerary_items")
      .delete()
      .eq("trip_id", tripId)
      .eq("is_ai_generated", true);

    // Build new items from ParsedItinerary
    const items: TablesInsert<"itinerary_items">[] = [];

    for (const day of itinerary.days) {
      let orderIndex = 0;

      const addActivities = (
        slot: string,
        activities?: string[],
        meal?: string,
      ) => {
        if (activities) {
          for (const activity of activities) {
            items.push({
              trip_id: tripId,
              created_by: createdBy,
              type: "activity",
              title: activity,
              activity_description: activity,
              time_slot: slot,
              day_number: day.day,
              order_index: orderIndex++,
              is_ai_generated: true,
              all_day: false,
            });
          }
        }
        if (meal) {
          items.push({
            trip_id: tripId,
            created_by: createdBy,
            type: "activity",
            title: meal,
            activity_description: meal,
            time_slot: slot,
            food_suggestion: meal,
            day_number: day.day,
            order_index: orderIndex++,
            is_ai_generated: true,
            all_day: false,
          });
        }
      };

      addActivities("morning", day.morning?.activities, day.morning?.breakfast);
      addActivities("afternoon", day.afternoon?.activities, day.afternoon?.lunch);
      addActivities("evening", day.evening?.activities, day.evening?.dinner);
    }

    if (items.length > 0) {
      await supabase.from("itinerary_items").insert(items);
    }

    // Update trip
    await supabase
      .from("trips")
      .update({
        ai_itinerary_data: itinerary as unknown as Json,
        itinerary_status: "completed",
        itinerary_generated_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    // Mark job completed
    await supabase
      .from("itinerary_generation_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.info(`[Orchestrator] Persisted ${items.length} items for trip ${tripId}, job ${jobId}`);
  }
}

function emitLog(agentName: string, thought: string, emitter: StreamEmitter) {
  emitter.emit({ type: "agent_thought", timestamp: now(), agentName, thought });
}
