import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ItineraryItem {
  id: string;
  trip_id: string;
  created_by: string;
  type: string;
  title: string;
  notes: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  order_index: number | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useItineraryItems = (tripId: string) => {
  return useQuery<ItineraryItem[]>({
    queryKey: ['itineraryItems', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as ItineraryItem[];
    },
    enabled: !!tripId,
  });
};
