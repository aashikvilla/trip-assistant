import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  upcomingTripsCount: number;
  nextTripDays: number | null;
  placesVisitedCount: number; // total itinerary items across user's trips
  travelBuddiesCount: number; // distinct other members across user's trips
}

export const useDashboardStats = (userId?: string) => {
  return useQuery<DashboardStats>({
    queryKey: ['dashboardStats', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { upcomingTripsCount: 0, nextTripDays: null, placesVisitedCount: 0, travelBuddiesCount: 0 };

      const today = new Date().toISOString().split('T')[0];

      // Trips I am a member of (accepted)
      const { data: myTrips, error: tripsErr } = await supabase
        .from('trip_members')
        .select('trip_id, trips!inner(id, name, start_date, end_date, destination_main)')
        .eq('profile_id', userId)
        .eq('invitation_status', 'accepted');
      if (tripsErr) throw tripsErr;

      type TripRow = { id: string; name: string | null; start_date: string | null; end_date: string | null; destination_main: string | null };
      type MemberTrip = { trip_id: string; trips: TripRow };
      const trips: TripRow[] = ((myTrips as MemberTrip[]) || []).map((tm) => tm.trips);
      const tripIds: string[] = trips.map((t) => t.id);

      // Upcoming trips
      const upcomingTrips = trips.filter((t) => t.start_date && t.start_date >= today);
      const nextTrip = upcomingTrips
        .slice()
        .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))[0];
      const nextTripDays = nextTrip
        ? Math.ceil((new Date(nextTrip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      // Places visited = distinct destinations from trips (destination_main)
      const destinations = new Set(
        trips
          .map((t) => (t.destination_main || '').trim())
          .filter((d) => d.length > 0)
      );
      const placesVisitedCount = destinations.size;

      // Travel buddies = distinct members across my trips excluding me
      let travelBuddiesCount = 0;
      if (tripIds.length) {
        const { data: members, error: membersErr } = await supabase
          .from('trip_members')
          .select('profile_id')
          .in('trip_id', tripIds)
          .eq('invitation_status', 'accepted');
        if (membersErr) throw membersErr;
        const set = new Set(((members || []) as { profile_id: string }[]).map(m => m.profile_id).filter((pid: string) => pid !== userId));
        travelBuddiesCount = set.size;
      }

      return {
        upcomingTripsCount: upcomingTrips.length,
        nextTripDays,
        placesVisitedCount,
        travelBuddiesCount,
      };
    },
  });
};
