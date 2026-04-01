import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { TripRecommendation } from "@/services/ai/types";

function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface SaveRecommendationInput {
  tripId: string;
  userId: string;
  destination: string;
  text: string;
}

type RawRecommendation = {
  id: string;
  trip_id: string;
  user_id: string;
  destination: string;
  text: string;
  created_at: string;
};

type RawCoTravelerRec = RawRecommendation & {
  recommender_name: string;
  destination_trip_count: number;
  total_trip_count: number;
};

export class RecommendationService {
  /**
   * Returns up to 3 co-traveler recommendations for the trip's destinations.
   * Co-traveler = user who shares at least one accepted trip with the requesting user.
   * Ranked by: destination trip count desc → total trip count desc.
   */
  async getForTrip(tripId: string, userId: string): Promise<TripRecommendation[]> {
    const supabase = getServiceClient();

    // Get trip destinations
    const { data: trip } = await supabase
      .from("trips")
      .select("destination_main")
      .eq("id", tripId)
      .single();

    if (!trip) return [];

    let destinations: string[] = [];
    if (trip.destination_main) {
      try {
        destinations = JSON.parse(trip.destination_main);
      } catch {
        destinations = [trip.destination_main];
      }
    }

    if (destinations.length === 0) return [];

    // Find co-travelers (users sharing at least one accepted trip with the requesting user)
    const { data: myTrips } = await supabase
      .from("trip_members")
      .select("trip_id")
      .eq("profile_id", userId)
      .eq("invitation_status", "accepted");

    if (!myTrips?.length) return [];

    const myTripIds = myTrips.map((t) => t.trip_id);

    const { data: coTravelerMembers } = await supabase
      .from("trip_members")
      .select("profile_id")
      .in("trip_id", myTripIds)
      .eq("invitation_status", "accepted")
      .neq("profile_id", userId);

    const coTravelerIds = [...new Set((coTravelerMembers ?? []).map((m) => m.profile_id))];
    if (coTravelerIds.length === 0) return [];

    // Fetch recommendations from co-travelers for matching destinations
    const { data: recs } = await supabase
      .from("trip_recommendations" as "trips")
      .select("*, profiles!user_id(first_name, last_name)")
      .in("user_id", coTravelerIds)
      .in("destination", destinations) as unknown as { data: Array<RawRecommendation & { profiles: { first_name: string; last_name: string } | null }> | null };

    if (!recs?.length) return [];

    // Compute ranking: destination trip count + total trip count per recommender
    const recommenderTripCounts: Record<string, { destination: number; total: number }> = {};

    for (const coId of coTravelerIds) {
      const { count: totalCount } = await supabase
        .from("trip_members")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", coId)
        .eq("invitation_status", "accepted");

      recommenderTripCounts[coId] = {
        destination: 0,
        total: totalCount ?? 0,
      };
    }

    // Count trips to destinations for each co-traveler
    const { data: destTrips } = await supabase
      .from("trip_members")
      .select("profile_id, trips!trip_id(destination_main)")
      .in("profile_id", coTravelerIds)
      .eq("invitation_status", "accepted") as unknown as {
        data: Array<{ profile_id: string; trips: { destination_main: string } | null }> | null;
      };

    for (const dt of destTrips ?? []) {
      const destMain = dt.trips?.destination_main;
      if (!destMain) continue;

      let tripDests: string[] = [];
      try {
        tripDests = JSON.parse(destMain);
      } catch {
        tripDests = [destMain];
      }

      const matchesDest = destinations.some((d) =>
        tripDests.some((td) => td.toLowerCase() === d.toLowerCase()),
      );

      if (matchesDest && recommenderTripCounts[dt.profile_id]) {
        recommenderTripCounts[dt.profile_id].destination++;
      }
    }

    // Sort and return up to 3
    const sorted = [...recs]
      .map((r) => ({
        ...r,
        destCount: recommenderTripCounts[r.user_id]?.destination ?? 0,
        totalCount: recommenderTripCounts[r.user_id]?.total ?? 0,
      }))
      .sort((a, b) => {
        if (b.destCount !== a.destCount) return b.destCount - a.destCount;
        return b.totalCount - a.totalCount;
      })
      .slice(0, 3);

    return sorted.map((r) => ({
      id: r.id,
      tripId: r.trip_id,
      userId: r.user_id,
      recommenderName: r.profiles
        ? `${r.profiles.first_name ?? ""} ${r.profiles.last_name ?? ""}`.trim()
        : "Co-traveler",
      destination: r.destination,
      text: r.text,
      createdAt: r.created_at,
    }));
  }

  /**
   * Saves a new recommendation.
   */
  async saveRecommendation(input: SaveRecommendationInput): Promise<void> {
    const supabase = getServiceClient();

    await supabase.from("trip_recommendations" as "trips").insert({
      trip_id: input.tripId,
      user_id: input.userId,
      destination: input.destination,
      text: input.text,
    } as unknown as Parameters<ReturnType<typeof supabase.from>["insert"]>[0]);
  }
}
