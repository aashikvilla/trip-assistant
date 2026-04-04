import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { createLLMProvider } from "@/services/ai/providers";
import { Orchestrator } from "@/services/ai/orchestrator";
import { SingleAgentOrchestrator } from "@/services/ai/singleAgentOrchestrator";
import type { StreamEmitter, StreamEvent } from "@/services/ai/types";

// Vercel Pro supports up to 300s (5 min). Hobby is capped at 60s.
// Single-agent itinerary generation can take 4–6 minutes on free LLM tier.
// Upgrade to Vercel Pro for full support: https://vercel.com/pricing
export const maxDuration = 300;

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get("tripId");

  if (!tripId) {
    return new Response(JSON.stringify({ error: "tripId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify auth via session cookie
  const serverClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await serverClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceClient();

  // Verify trip exists
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    return new Response(JSON.stringify({ error: "Trip not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify trip membership
  const { data: membership } = await supabase
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("profile_id", user.id)
    .eq("invitation_status", "accepted")
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ error: "Not a trip member" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from("itinerary_generation_jobs")
    .insert({ trip_id: tripId, status: "pending" })
    .select("id")
    .single();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Failed to create job" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mark trip as generating
  await supabase
    .from("trips")
    .update({ itinerary_status: "generating", itinerary_generated_at: null })
    .eq("id", tripId);

  // Update job to streaming
  await supabase
    .from("itinerary_generation_jobs")
    .update({ status: "streaming" })
    .eq("id", job.id);

  const abortController = new AbortController();

  // Handle client disconnect
  request.signal.addEventListener("abort", () => {
    abortController.abort();
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const emitter: StreamEmitter = {
        emit(event: StreamEvent) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Controller may be closed
          }
        },
      };

      // Send job ID as the first event so the client can cancel
      emitter.emit({
        type: "job_created",
        timestamp: new Date().toISOString(),
        jobId: job.id,
      });

      // SSE heartbeat — sends a comment every 20s to keep the connection alive.
      // Without this, proxies and Vercel's edge layer close idle SSE connections
      // before the LLM finishes (single-agent calls can take 4–6 min).
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20_000);

      // Feature flag: ITINERARY_AGENT_MODE=single uses one LLM call (rate-limit friendly)
      // Default "multi" uses the full Research → Planning pipeline
      const agentMode = process.env.ITINERARY_AGENT_MODE ?? "multi";
      const runner = agentMode === "single"
        ? new SingleAgentOrchestrator(emitter, abortController)
        : new Orchestrator(createLLMProvider("ITINERARY_PLANNING"), emitter, abortController);

      console.info("[Stream] Starting generation", { tripId, jobId: job.id, agentMode });

      try {
        await runner.run(tripId, job.id);
        clearInterval(heartbeatInterval);
      } catch (err) {
        // Catch any errors not handled by orchestrator and ensure trips table is updated
        const message = err instanceof Error ? err.message : "Unknown error";

        await supabase
          .from("itinerary_generation_jobs")
          .update({
            status: "failed",
            error_message: message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await supabase
          .from("trips")
          .update({
            itinerary_status: "failed",
            itinerary_generated_at: new Date().toISOString(),
          })
          .eq("id", tripId);

        // Emit error event
        emitter.emit({
          type: "error",
          timestamp: new Date().toISOString(),
          message,
          recoverable: false,
        });
      } finally {
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
