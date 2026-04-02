import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface TripNotification {
  id: string;
  trip_id: string;
  poll_id: string | null;
  user_id: string;
  type: 'poll_deadline_24h' | 'poll_overdue' | 'poll_nudge';
  message: string;
  link: string | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export function useNotifications(tripId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, tripId],
    queryFn: async (): Promise<TripNotification[]> => {
      if (!user) return [];

      let query = supabase
        .from('trip_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (tripId) query = query.eq('trip_id', tripId);

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (tripId: string) => {
    if (!user) return;
    await supabase
      .from('trip_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('trip_id', tripId)
      .eq('is_read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
  };

  return { notifications, unreadCount, isLoading, markRead };
}
