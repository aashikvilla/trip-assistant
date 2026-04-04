import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface TripMemberRow {
  id: string;
  role: 'owner' | 'editor' | 'viewer';
  profile_id: string;
  invitation_status: 'pending' | 'accepted' | 'declined' | 'expired';
  profiles: Profile | null;
}

export interface TripMember extends Omit<TripMemberRow, 'profiles'>, Omit<Profile, 'id'> {}

export function useTripMembers(tripId?: string) {
  return useQuery<TripMember[]>({
    queryKey: ['trip-members', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          id,
          role,
          profile_id,
          invitation_status,
          profiles:profiles!trip_members_profile_id_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('trip_id', tripId)
        .eq('invitation_status', 'accepted');

      if (error) {
        console.error('Error fetching trip members:', error);
        throw error;
      }

      // Transform the data to flatten the profile data
      return (data as TripMemberRow[])
        .filter((member): member is TripMemberRow & { profiles: Profile } => 
          member.profiles !== null
        )
        .map(({ profiles, ...member }) => ({
          ...member,
          ...profiles,
        }));
    },
    enabled: !!tripId,
  });
}
