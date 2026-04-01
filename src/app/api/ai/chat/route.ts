import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { createLLMProvider } from "@/services/ai/providers";
import { DBContextTool } from "@/services/ai/tools/dbContextTool";
import type { StreamEmitter, StreamEvent, LLMMessage } from "@/services/ai/types";
import { now } from "@/services/ai/utils";

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: Request) {
  const serverClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await serverClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let tripId: string;
  let message: string;

  try {
    const body = await request.json() as { tripId: string; message: string };
    tripId = body.tripId;
    message = body.message;
    if (!tripId || !message) throw new Error("Missing fields");
  } catch {
    return new Response(JSON.stringify({ error: "tripId and message are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getServiceClient();

  // Verify membership
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

  // Load message history (last 10 @AI exchanges)
  const { data: historyMessages } = await supabase
    .from("trip_messages")
    .select("content, message_type, user_id")
    .eq("trip_id", tripId)
    .in("message_type", ["user_message", "ai_response"])
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (historyMessages ?? [])
    .reverse()
    .filter((m) => m.content?.startsWith("@AI") || m.message_type === "ai_response")
    .slice(-20);

  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort());

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

      try {
        // Load trip context
        const dbTool = new DBContextTool();
        const contextResult = await dbTool.execute({ tripId }, abortController.signal);

        const tripContext = contextResult.data;
        const systemPrompt = tripContext
          ? `You are a helpful AI travel assistant for the trip "${tripContext.trip.name}" to ${tripContext.trip.destinations.join(", ")}.
Answer questions about the trip, suggest activities, help with planning decisions, and provide travel tips.
Trip details: ${tripContext.trip.tripLengthDays} days, ${tripContext.trip.budget} budget, ${tripContext.trip.vibe} vibe.
${tripContext.aggregatedDietary.length > 0 ? `Dietary restrictions: ${tripContext.aggregatedDietary.join(", ")}` : ""}
Be concise, friendly, and helpful.`
          : "You are a helpful AI travel assistant. Answer questions about travel planning.";

        const messages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          ...history.map((m): LLMMessage => ({
            role: m.message_type === "ai_response" ? "assistant" : "user",
            content: m.content ?? "",
          })),
          { role: "user", content: message },
        ];

        const provider = createLLMProvider();
        let fullResponse = "";

        emitter.emit({
          type: "agent_thought",
          timestamp: now(),
          agentName: "ChatAssistant",
          thought: "Processing your question...",
        });

        for await (const token of provider.streamChat(messages, undefined, abortController.signal)) {
          fullResponse += token;
        }

        // Persist AI response to trip_messages
        await supabase.from("trip_messages").insert({
          trip_id: tripId,
          user_id: user.id,
          content: fullResponse,
          message_type: "ai_response",
        });

        emitter.emit({
          type: "ai_message",
          timestamp: now(),
          content: fullResponse,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitter.emit({
          type: "error",
          timestamp: now(),
          message,
          recoverable: true,
        });
      } finally {
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
    },
  });
}
