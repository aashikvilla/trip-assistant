import { createSupabaseServerClient } from "@/integrations/supabase/server";
import { RecommendationService } from "@/services/recommendations/recommendationService";
import { NextResponse } from "next/server";

const service = new RecommendationService();

export async function GET(request: Request) {
  const serverClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await serverClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get("tripId");

  if (!tripId) {
    return NextResponse.json({ error: "tripId is required" }, { status: 400 });
  }

  // Verify trip membership
  const { data: membership } = await serverClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("profile_id", user.id)
    .eq("invitation_status", "accepted")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
  }

  const recommendations = await service.getForTrip(tripId, user.id);
  return NextResponse.json(recommendations);
}

export async function POST(request: Request) {
  const serverClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await serverClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tripId: string;
  let destination: string;
  let text: string;

  try {
    const body = await request.json() as { tripId: string; destination: string; text: string };
    tripId = body.tripId;
    destination = body.destination;
    text = body.text;
    if (!tripId || !destination || !text) throw new Error("Missing fields");
  } catch {
    return NextResponse.json({ error: "tripId, destination, and text are required" }, { status: 400 });
  }

  // Verify trip membership
  const { data: membership } = await serverClient
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("profile_id", user.id)
    .eq("invitation_status", "accepted")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
  }

  await service.saveRecommendation({ tripId, userId: user.id, destination, text });
  return NextResponse.json({ success: true }, { status: 201 });
}
