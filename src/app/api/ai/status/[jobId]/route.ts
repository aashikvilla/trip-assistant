import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/integrations/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("itinerary_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
