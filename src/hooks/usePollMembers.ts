import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PollMember {
  user_id: string;
  user_name: string;
}

export function usePollMembers(tripId: string) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['trip-members-poll', tripId],
    queryFn: async (): Promise<PollMember[]> => {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          profiles!trip_members_user_id_fkey(first_name, last_name)
        `)
        .eq('trip_id', tripId)
        .eq('invitation_status', 'accepted');

      if (error) throw error;

      return (data || []).map((row: any) => ({
        user_id: row.user_id,
        user_name: row.profiles
          ? `${row.profiles.first_name ?? ''} ${row.profiles.last_name ?? ''}`.trim()
          : 'Unknown',
      }));
    },
    enabled: !!tripId,
    staleTime: 60000,
  });

  return { members, isLoading };
}
