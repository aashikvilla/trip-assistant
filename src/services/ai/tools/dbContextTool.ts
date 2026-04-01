import { createClient } from "@supabase/supabase-js";
import { differenceInDays } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import type {
  Tool,
  ToolResult,
  TripContext,
  ItineraryItem,
  Booking,
  TripRecommendation,
} from "../types";
import { TripNotFoundError, ContextTimeoutError } from "../types";

export interface DBContextInput {
  tripId: string;
}

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

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

export class DBContextTool implements Tool<DBContextInput, TripContext> {
  name = "db_context";
  description = "Load full trip context from the database including members, preferences, and existing itinerary.";

  async execute(input: DBContextInput, signal?: AbortSignal): Promise<ToolResult<TripContext>> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new ContextTimeoutError()), 5_000),
    );

    try {
      const context = await Promise.race([
        this.fetchContext(input.tripId),
        timeoutPromise,
      ]);

      if (signal?.aborted) {
        return { success: false, error: "Aborted" };
      }

      return { success: true, data: context };
    } catch (err) {
      if (err instanceof TripNotFoundError || err instanceof ContextTimeoutError) {
        throw err;
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to fetch context",
      };
    }
  }

  private async fetchContext(tripId: string): Promise<TripContext> {
    const supabase = getServiceClient();

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      throw new TripNotFoundError(tripId);
    }

    // Fetch members
    const { data: members } = await supabase
      .from("trip_members")
      .select("profile_id, profiles(id, preferences, first_name, last_name)")
      .eq("trip_id", tripId)
      .eq("invitation_status", "accepted");

    // Fetch existing itinerary items
    const { data: itineraryItems } = await supabase
      .from("itinerary_items")
      .select("id, trip_id, day_number, time_slot, title, activity_description, is_ai_generated")
      .eq("trip_id", tripId)
      .order("day_number", { ascending: true })
      .order("order_index", { ascending: true });

    // Fetch bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, type, start_time, end_time, provider, price")
      .eq("trip_id", tripId);

    // Fetch co-traveler recommendations (if table exists)
    let recommendations: TripRecommendation[] = [];
    try {
      const { data: recs } = await supabase
        .from("trip_recommendations" as "trips") // type cast since it might not be in types yet
        .select("*")
        .eq("trip_id", tripId);

      if (recs) {
        recommendations = (recs as unknown as Array<{
          id: string;
          trip_id: string;
          user_id: string;
          destination: string;
          text: string;
          created_at: string;
        }>).map((r) => ({
          id: r.id,
          tripId: r.trip_id,
          userId: r.user_id,
          recommenderName: "Co-traveler",
          destination: r.destination,
          text: r.text,
          createdAt: r.created_at,
        }));
      }
    } catch {
      // Table may not exist yet; continue without recommendations
    }

    // Calculate trip length
    const startDate = trip.start_date ?? new Date().toISOString().split("T")[0];
    const endDate = trip.end_date ?? startDate;
    const tripLengthDays = Math.max(
      1,
      differenceInDays(new Date(endDate), new Date(startDate)) + 1,
    );

    // Budget mapping
    const budgetMap: Record<string, "low" | "mid" | "high"> = {
      budget: "low", low: "low",
      mid_range: "mid", mid: "mid",
      luxury: "high", ultra_luxury: "high", high: "high",
    };
    const budget = budgetMap[(trip.budget ?? "").toLowerCase()] ?? "mid";

    const activityMap: Record<string, "light" | "moderate" | "active"> = {
      low: "light", light: "light",
      moderate: "moderate",
      high: "active", active: "active",
    };
    const activityLevel = activityMap[(trip.activity_level ?? "").toLowerCase()] ?? "moderate";

    // Parse destinations
    let destinations: string[] = [];
    if (trip.destination_main) {
      try {
        destinations = JSON.parse(trip.destination_main);
      } catch {
        destinations = [trip.destination_main];
      }
    }

    // Process members
    type MemberRow = {
      profile_id: string;
      profiles: { id: string; preferences?: unknown; first_name?: string; last_name?: string } | null;
    };

    const processedMembers: TripContext["members"] = [];
    const dietarySet = new Set<string>();

    if (members) {
      (members as unknown as MemberRow[]).forEach((m) => {
        const prefs = m.profiles?.preferences as Record<string, unknown> | undefined;
        const interests = safeStringArray(prefs?.interests);
        const dietary = safeStringArray(prefs?.dietary);
        processedMembers.push({ profileId: m.profile_id, interests, dietaryRestrictions: dietary });
        dietary.forEach((d) => dietarySet.add(d.toLowerCase().trim()));
      });
    }

    safeStringArray(trip.dietary_preferences).forEach((d) =>
      dietarySet.add(d.toLowerCase().trim()),
    );

    const processedItems: ItineraryItem[] = (itineraryItems ?? []).map((item) => ({
      id: item.id,
      tripId: item.trip_id,
      dayNumber: item.day_number ?? 1,
      timeSlot: item.time_slot ?? "",
      activityName: item.title,
      description: item.activity_description ?? "",
      isAiGenerated: item.is_ai_generated ?? false,
    }));

    const processedBookings: Booking[] = (bookings ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      startTime: b.start_time,
      endTime: b.end_time ?? undefined,
      provider: b.provider,
      price: b.price,
    }));

    return {
      trip: {
        id: trip.id,
        name: trip.name ?? "My Trip",
        destinations,
        startDate,
        endDate,
        tripLengthDays,
        travelStyle: trip.travel_style ?? "Group",
        vibe: trip.vibe ?? "Relaxed",
        budget,
        activityLevel,
        mustDoActivities: safeStringArray(trip.must_do_activities),
        description: trip.description ?? `A ${tripLengthDays}-day trip.`,
      },
      members: processedMembers,
      aggregatedDietary: Array.from(dietarySet),
      existingItineraryItems: processedItems,
      bookings: processedBookings,
      coTravelerRecommendations: recommendations,
    };
  }
}
