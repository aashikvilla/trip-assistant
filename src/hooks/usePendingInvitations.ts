import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PendingInvitation {
  id: string;
  trip_id: string;
  invitation_token: string;
  role: string;
  expires_at: string;
  created_at: string;
  trip_name: string;
  trip_destination: string | null;
  trip_start_date: string | null;
  trip_end_date: string | null;
  invited_by_name: string;
  member_count: number;
}

export function usePendingInvitations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['pending-invitations', user?.id],
    queryFn: async (): Promise<PendingInvitation[]> => {
      if (!user?.email) return [];

      const { data, error } = await supabase
        .from('trip_invitations')
        .select(`
          id,
          trip_id,
          invitation_token,
          role,
          expires_at,
          created_at,
          trips(
            name,
            destination_main,
            start_date,
            end_date,
            trip_members(id)
          ),
          inviter:profiles!trip_invitations_invited_by_fkey(first_name, last_name)
        `)
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((inv: any) => ({
        id: inv.id,
        trip_id: inv.trip_id,
        invitation_token: inv.invitation_token,
        role: inv.role,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        trip_name: inv.trips?.name || 'Unknown Trip',
        trip_destination: inv.trips?.destination_main || null,
        trip_start_date: inv.trips?.start_date || null,
        trip_end_date: inv.trips?.end_date || null,
        invited_by_name: inv.inviter
          ? `${inv.inviter.first_name || ''} ${inv.inviter.last_name || ''}`.trim()
          : 'Someone',
        member_count: inv.trips?.trip_members?.length || 0,
      }));
    },
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationToken: string) => {
      const { data, error } = await supabase.rpc('accept_trip_invitation', {
        invitation_token_param: invitationToken,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; trip_id?: string };
      if (!result.success) throw new Error(result.error || 'Failed to join trip');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('trip_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
    },
  });

  return {
    invitations,
    isLoading,
    acceptInvitation: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
    declineInvitation: declineMutation.mutateAsync,
    isDeclining: declineMutation.isPending,
  };
}
