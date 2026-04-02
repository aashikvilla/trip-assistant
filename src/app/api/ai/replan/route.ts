import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { createLLMProvider } from "@/services/ai/providers";
import { DBContextTool } from "@/services/ai/tools/dbContextTool";
import { PlanningAgent } from "@/services/ai/agents/planningAgent";
import type { StreamEmitter, StreamEvent, ParsedItinerary } from "@/services/ai/types";
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
  let dayNumber: number;
  let reason: string | undefined;

  try {
    const body = await request.json() as { tripId: string; dayNumber: number; reason?: string };
    tripId = body.tripId;
    dayNumber = body.dayNumber;
    reason = body.reason;
    if (!tripId || !dayNumber) throw new Error("Missing fields");
  } catch {
    return new Response(JSON.stringify({ error: "tripId and dayNumber are required" }), {
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

  // Get trip to verify day number exists
  const { data: tripData } = await supabase
    .from("trips")
    .select("ai_itinerary_data")
    .eq("id", tripId)
    .single();

  if (tripData?.ai_itinerary_data) {
    const itinerary = tripData.ai_itinerary_data as unknown as ParsedItinerary;
    if (itinerary.days && !itinerary.days.find((d) => d.day === dayNumber)) {
      return new Response(
        JSON.stringify({ error: `Day ${dayNumber} does not exist in the current itinerary` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

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

        if (!contextResult.success || !contextResult.data) {
          throw new Error("Failed to load trip context");
        }

        const tripContext = contextResult.data;
        const existingItinerary = tripData?.ai_itinerary_data as unknown as ParsedItinerary | undefined;

        const planningAgent = new PlanningAgent();
        const result = await planningAgent.run(
          {
            tripContext,
            existingItinerary,
            dayNumber,
            reason,
            abortSignal: abortController.signal,
          },
          emitter,
        );

        if (result.success && result.data) {
          const replannedItinerary = result.data as ParsedItinerary;
          const replannedDay = replannedItinerary.days[0];

          if (replannedDay) {
            // Delete old items for this day
            await supabase
              .from("itinerary_items")
              .delete()
              .eq("trip_id", tripId)
              .eq("day_number", dayNumber)
              .eq("is_ai_generated", true);

            // Insert new items
            const items = [];
            let orderIndex = 0;

            const addActs = (slot: string, activities?: string[], meal?: string) => {
              if (activities) {
                for (const a of activities) {
                  items.push({
                    trip_id: tripId,
                    created_by: null,
                    type: "activity" as const,
                    title: a,
                    activity_description: a,
                    time_slot: slot,
                    day_number: dayNumber,
                    order_index: orderIndex++,
                    is_ai_generated: true,
                    all_day: false,
                  });
                }
              }
              if (meal) {
                items.push({
                  trip_id: tripId,
                  created_by: null,
                  type: "activity" as const,
                  title: meal,
                  activity_description: meal,
                  time_slot: slot,
                  food_suggestion: meal,
                  day_number: dayNumber,
                  order_index: orderIndex++,
                  is_ai_generated: true,
                  all_day: false,
                });
              }
            };

            addActs("morning", replannedDay.morning?.activities, replannedDay.morning?.breakfast);
            addActs("afternoon", replannedDay.afternoon?.activities, replannedDay.afternoon?.lunch);
            addActs("evening", replannedDay.evening?.activities, replannedDay.evening?.dinner);

            if (items.length > 0) {
              await supabase.from("itinerary_items").insert(items);
            }

            // Update trip's ai_itinerary_data
            if (existingItinerary) {
              const updatedDays = existingItinerary.days.map((d) =>
                d.day === dayNumber ? replannedDay : d,
              );
              const updatedItinerary: ParsedItinerary = { ...existingItinerary, days: updatedDays };
              await supabase
                .from("trips")
                .update({ ai_itinerary_data: updatedItinerary as unknown as Record<string, unknown> })
                .eq("id", tripId);

              emitter.emit({
                type: "itinerary_complete",
                timestamp: now(),
                itinerary: updatedItinerary,
              });
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        emitter.emit({ type: "error", timestamp: now(), message: msg, recoverable: true });
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
