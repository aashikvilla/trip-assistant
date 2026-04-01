// This endpoint has been superseded by the SSE streaming endpoint at
// GET /api/ai/generate-itinerary/stream
// Kept as a 410 redirect for backward compatibility.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { differenceInDays } from "date-fns";
import { buildSystemPrompt, buildUserPrompt, parseAIResponse } from "@/services/ai/promptBuilder";
import type { Database } from "@/integrations/supabase/types";
import type {
  N8NComprehensiveRequest,
  N8NTripDetails,
  N8NTraveler,
  N8NGlobalPreferences,
} from "@/types/n8n";
import type { TablesInsert } from "@/integrations/supabase/types";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Server-only Supabase client with service role — never import from client.ts
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── Build request from trip data ────────────────────────────────────────────

interface MemberRow {
  profile_id: string;
  profiles: { id: string; preferences?: Json } | null;
}

async function buildRequestFromTrip(
  tripId: string,
  supabase: ReturnType<typeof getServiceClient>,
): Promise<N8NComprehensiveRequest> {
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    throw new Error(`Trip not found: ${tripError?.message || tripId}`);
  }

  const { data: members } = await supabase
    .from("trip_members")
    .select("profile_id, profiles(id, preferences)")
    .eq("trip_id", tripId)
    .eq("invitation_status", "accepted");

  // Calculate trip length
  const startDate = trip.start_date ? new Date(trip.start_date) : new Date();
  const endDate = trip.end_date ? new Date(trip.end_date) : startDate;
  const tripLengthDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

  // Budget mapping
  const budgetMap: Record<string, "low" | "mid" | "high"> = {
    budget: "low", low: "low",
    mid_range: "mid", mid: "mid",
    luxury: "high", ultra_luxury: "high", high: "high",
  };
  const budget = budgetMap[(trip.budget || "").toLowerCase()] || "mid";

  // Activity level mapping
  const activityMap: Record<string, "light" | "moderate" | "active"> = {
    low: "light", light: "light",
    moderate: "moderate",
    high: "active", active: "active",
  };
  const activityLevel = activityMap[(trip.activity_level || "").toLowerCase()] || "moderate";

  // Parse destinations
  let destinations: string[] = [];
  if (trip.destination_main) {
    try {
      destinations = JSON.parse(trip.destination_main);
    } catch {
      destinations = [trip.destination_main];
    }
  }

  const tripDetails: N8NTripDetails = {
    destinations,
    trip_name: trip.name || "My Trip",
    trip_length_days: tripLengthDays,
    travel_dates: {
      start_date: trip.start_date || new Date().toISOString().split("T")[0],
      end_date: trip.end_date || new Date().toISOString().split("T")[0],
    },
    travel_style: trip.travel_style || "Group",
    vibe: trip.vibe || "Relaxed and fun",
    budget,
    activity_level: activityLevel,
    must_do: Array.isArray(trip.must_do_activities) ? trip.must_do_activities : [],
    description: trip.description || `A ${tripLengthDays}-day trip to ${destinations[0] || "explore new places"}.`,
  };

  // Process members
  const travelers: N8NTraveler[] = [];
  const dietarySet = new Set<string>();

  const safeStringArray = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
      } catch {
        return value.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  if (members && Array.isArray(members)) {
    (members as unknown as MemberRow[]).forEach((member, i) => {
      const prefs = member.profiles?.preferences as Record<string, unknown> | undefined;
      const interests = safeStringArray(prefs?.interests);
      const dietary = safeStringArray(prefs?.dietary);

      travelers.push({ id: `traveler_${i + 1}`, interests, dietary_restrictions: dietary });
      dietary.forEach((d) => dietarySet.add(d.toLowerCase().trim()));
    });
  }

  // Add trip-level dietary preferences
  safeStringArray(trip.dietary_preferences).forEach((d) =>
    dietarySet.add(d.toLowerCase().trim()),
  );

  const globalPreferences: N8NGlobalPreferences = { dietary: Array.from(dietarySet) };

  return { trip_details: tripDetails, travelers, global_preferences: globalPreferences };
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(_request: Request) {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use GET /api/ai/generate-itinerary/stream?tripId=<id> instead.",
      stream_endpoint: "/api/ai/generate-itinerary/stream",
    },
    { status: 410 },
  );
}

async function _legacyPOST(request: Request) {
  const supabase = getServiceClient();

  let tripId: string;
  try {
    const body = await request.json();
    tripId = body.tripId;
    if (!tripId || typeof tripId !== "string") {
      return NextResponse.json({ error: "tripId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Verify trip exists and get owner
  const { data: tripRow, error: tripCheckError } = await supabase
    .from("trips")
    .select("id, created_by")
    .eq("id", tripId)
    .single();

  if (tripCheckError || !tripRow) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const createdBy = tripRow.created_by as string;

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from("itinerary_generation_jobs")
    .insert({
      trip_id: tripId,
      status: "pending",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("Failed to create job record:", jobError);
    return NextResponse.json(
      { error: "Failed to create job", details: jobError?.message },
      { status: 500 }
    );
  }

  // Set trip status to generating
  await supabase
    .from("trips")
    .update({ itinerary_status: "generating", itinerary_generated_at: null })
    .eq("id", tripId);

  // Return immediately — process in background
  const jobId = job.id;

  // Fire-and-forget background processing
  processInBackground(tripId, jobId, createdBy, supabase).catch(() => {
    // Errors are handled inside processInBackground
  });

  return NextResponse.json({ jobId, status: "pending" });
}

// ── Background processing ───────────────────────────────────────────────────

async function processInBackground(
  tripId: string,
  jobId: string,
  createdBy: string,
  supabase: ReturnType<typeof getServiceClient>,
) {
  try {
    // Update job to processing
    await supabase
      .from("itinerary_generation_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    // Build the request payload from trip data
    const tripRequest = await buildRequestFromTrip(tripId, supabase);

    // Call OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";

    if (!openrouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterApiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Vibe Trip",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: buildUserPrompt(tripRequest),
          },
        ],
        system: buildSystemPrompt(),
        max_tokens: 4000,
        temperature: 1,
      }),
    });

    if (!openrouterResponse.ok) {
      const error = await openrouterResponse.text();
      throw new Error(`OpenRouter API error: ${openrouterResponse.status} - ${error}`);
    }

    const responseData = await openrouterResponse.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const textContent = responseData.choices?.[0]?.message?.content;
    if (!textContent) {
      throw new Error("No text response from OpenRouter");
    }

    // Parse the structured response
    const output = parseAIResponse(textContent);

    // Store itinerary items
    const items: TablesInsert<"itinerary_items">[] = [];
    for (const day of output.itinerary) {
      for (const [actIdx, activity] of day.activities.entries()) {
        items.push({
          trip_id: tripId,
          created_by: createdBy,
          type: "activity",
          title: activity.activity_name,
          activity_description: activity.description,
          notes: null,
          location_name: null,
          time_slot: activity.time_slot,
          food_suggestion: activity.food_suggestion || null,
          external_link: activity.link || null,
          day_number: day.day_number,
          order_index: actIdx,
          is_ai_generated: true,
          all_day: false,
        });
      }
    }

    // Update trip with AI data
    await supabase
      .from("trips")
      .update({
        ai_itinerary_data: output as unknown as Json,
        hotel_recommendations: JSON.stringify(output.hotel_recommendations) as unknown as Json,
        itinerary_status: "completed",
        itinerary_generated_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    // Insert itinerary items
    if (items.length > 0) {
      const { error: insertError } = await supabase
        .from("itinerary_items")
        .insert(items);

      if (insertError) {
        throw new Error(`Failed to insert itinerary items: ${insertError.message}`);
      }
    }

    // Mark job completed
    await supabase
      .from("itinerary_generation_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Mark job failed
    await supabase
      .from("itinerary_generation_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Mark trip failed
    await supabase
      .from("trips")
      .update({
        itinerary_status: "failed",
        itinerary_generated_at: new Date().toISOString(),
      })
      .eq("id", tripId);
  }
}
