import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ItineraryStatusData {
  itinerary_status: string | null;
  itinerary_generated_at: string | null;
  job_status?: string | null;
  job_error?: string | null;
  job_id?: string | null;
  job_started_at?: string | null;
  job_completed_at?: string | null;
}

export const useItineraryStatus = (tripId: string) => {
  return useQuery<ItineraryStatusData, Error>({
    queryKey: ["itinerary-status", tripId],
    queryFn: async (): Promise<ItineraryStatusData> => {
      // Get trip status
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('itinerary_status, itinerary_generated_at')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Get latest job status for this trip
      const { data: jobData, error: jobError } = await supabase
        .from('itinerary_generation_jobs')
        .select('id, status, error_message, started_at, completed_at')
        .eq('trip_id', tripId)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      // Don't throw error if no job found - trip might not have jobs yet
      if (jobError && jobError.code !== 'PGRST116') {
        console.warn('Error fetching job status:', jobError);
      }

      return {
        itinerary_status: tripData.itinerary_status,
        itinerary_generated_at: tripData.itinerary_generated_at,
        job_status: jobData?.status || null,
        job_error: jobData?.error_message || null,
        job_id: jobData?.id || null,
        job_started_at: jobData?.started_at || null,
        job_completed_at: jobData?.completed_at || null,
      };
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 3 seconds if generating or processing, stop if completed/failed
      const isActive = data?.itinerary_status === 'generating' || 
                      data?.job_status === 'pending' || 
                      data?.job_status === 'processing';
      return isActive ? 3000 : false;
    },
    enabled: !!tripId,
  });
};
