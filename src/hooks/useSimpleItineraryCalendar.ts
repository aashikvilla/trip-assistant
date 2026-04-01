import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

type ItineraryItem = Tables<'itinerary_items'>;

interface UseSimpleItineraryCalendarProps {
  tripId: string;
}

export function useSimpleItineraryCalendar({ tripId }: UseSimpleItineraryCalendarProps) {
  const [selectedActivity, setSelectedActivity] = useState<ItineraryItem | null>(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for itinerary items
  const {
    data: activities = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['itinerary-items', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as ItineraryItem[];
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'itinerary_items'> }) => {
      const { data, error } = await supabase
        .from('itinerary_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      toast({
        title: "Activity updated",
        description: "The activity has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      toast({
        title: "Activity deleted",
        description: "The activity has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: `Failed to delete activity: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const openActivityModal = useCallback((activity: ItineraryItem) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  }, []);

  const closeActivityModal = useCallback(() => {
    setSelectedActivity(null);
    setIsActivityModalOpen(false);
  }, []);

  const updateActivity = useCallback((id: string, updates: TablesUpdate<'itinerary_items'>) => {
    updateActivityMutation.mutate({ id, updates });
  }, [updateActivityMutation]);

  const deleteActivity = useCallback((id: string) => {
    deleteActivityMutation.mutate(id);
  }, [deleteActivityMutation]);

  const moveActivity = useCallback((id: string, newDayNumber: number, newStartTime?: string) => {
    updateActivity(id, { 
      day_number: newDayNumber,
      start_time: newStartTime 
    });
  }, [updateActivity]);

  // Group activities by day
  const activitiesByDay = activities.reduce((acc, activity) => {
    const day = activity.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(activity);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  return {
    activities,
    activitiesByDay,
    isLoading,
    error,
    refetch,
    selectedActivity,
    isActivityModalOpen,
    openActivityModal,
    closeActivityModal,
    updateActivity,
    deleteActivity,
    moveActivity,
    isUpdating: updateActivityMutation.isPending,
    isDeleting: deleteActivityMutation.isPending,
  };
}
