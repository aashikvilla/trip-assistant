import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseItineraryCalendarProps {
  tripId: string;
  filter?: ActivityFilter;
}

export function useItineraryCalendar({ tripId, filter }: UseItineraryCalendarProps) {
  const [selectedActivity, setSelectedActivity] = useState<EnhancedItineraryItem | null>(null);
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
    queryKey: ['itinerary-items', tripId, filter],
    queryFn: () => enhancedItineraryService.getEnhancedItineraryItems(tripId, filter),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for trip statistics
  const { data: statistics } = useQuery({
    queryKey: ['trip-statistics', tripId],
    queryFn: () => enhancedItineraryService.getTripStatistics(tripId),
    enabled: !!tripId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for updating activity
  const updateActivityMutation = useMutation({
    mutationFn: ({ activityId, updates }: { activityId: string; updates: Partial<EnhancedItineraryItem> }) =>
      enhancedItineraryService.updateItineraryItem(activityId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-statistics', tripId] });
      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to update activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update activity. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for moving activity
  const moveActivityMutation = useMutation({
    mutationFn: ({ activityId, newDay, newTimeSlot }: { 
      activityId: string; 
      newDay: number; 
      newTimeSlot: string; 
    }) => enhancedItineraryService.moveActivityToDay(activityId, newDay, newTimeSlot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      toast({
        title: 'Success',
        description: 'Activity moved successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to move activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to move activity. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting activity
  const deleteActivityMutation = useMutation({
    mutationFn: (activityId: string) => enhancedItineraryService.deleteItineraryItem(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-statistics', tripId] });
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to delete activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete activity. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for reordering activities
  const reorderActivitiesMutation = useMutation({
    mutationFn: ({ dayNumber, itemIds }: { dayNumber: number; itemIds: string[] }) =>
      enhancedItineraryService.reorderActivitiesInDay(tripId, dayNumber, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-items', tripId] });
      toast({
        title: 'Success',
        description: 'Activities reordered successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to reorder activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder activities. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Group activities by day
  const activitiesByDay = useMemo(() => {
    const grouped: Record<number, EnhancedItineraryItem[]> = {};
    
    activities.forEach(activity => {
      const day = activity.day_number;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(activity);
    });

    // Sort activities within each day by time slot
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => {
        const timeA = a.time_slot?.split(' - ')[0] || '00:00';
        const timeB = b.time_slot?.split(' - ')[0] || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return grouped;
  }, [activities]);

  // Event handlers
  const handleActivityClick = useCallback((activity: EnhancedItineraryItem) => {
    setSelectedActivity(activity);
    setIsActivityModalOpen(true);
  }, []);

  const handleActivityUpdate = useCallback((activityId: string, updates: Partial<EnhancedItineraryItem>) => {
    updateActivityMutation.mutate({ activityId, updates });
  }, [updateActivityMutation]);

  const handleActivityMove = useCallback((activityId: string, newDay: number, newTimeSlot: string) => {
    moveActivityMutation.mutate({ activityId, newDay, newTimeSlot });
  }, [moveActivityMutation]);

  const handleActivityDelete = useCallback((activityId: string) => {
    deleteActivityMutation.mutate(activityId);
    setIsActivityModalOpen(false);
    setSelectedActivity(null);
  }, [deleteActivityMutation]);

  const handleReorderActivities = useCallback((dayNumber: number, itemIds: string[]) => {
    reorderActivitiesMutation.mutate({ dayNumber, itemIds });
  }, [reorderActivitiesMutation]);

  const closeActivityModal = useCallback(() => {
    setIsActivityModalOpen(false);
    setSelectedActivity(null);
  }, []);

  // Utility functions
  const getActivitiesForDay = useCallback((dayNumber: number) => {
    return activitiesByDay[dayNumber] || [];
  }, [activitiesByDay]);

  const getTotalDays = useCallback(() => {
    const dayNumbers = Object.keys(activitiesByDay).map(Number);
    return dayNumbers.length > 0 ? Math.max(...dayNumbers) : 0;
  }, [activitiesByDay]);

  const getActivityCount = useCallback(() => {
    return activities.length;
  }, [activities]);

  const getAiGeneratedCount = useCallback(() => {
    return activities.filter(activity => activity.is_ai_generated).length;
  }, [activities]);

  const getManualCount = useCallback(() => {
    return activities.filter(activity => !activity.is_ai_generated).length;
  }, [activities]);

  return {
    // Data
    activities,
    activitiesByDay,
    statistics,
    selectedActivity,
    
    // State
    isLoading,
    error,
    isActivityModalOpen,
    
    // Mutations state
    isUpdating: updateActivityMutation.isPending,
    isMoving: moveActivityMutation.isPending,
    isDeleting: deleteActivityMutation.isPending,
    isReordering: reorderActivitiesMutation.isPending,
    
    // Actions
    handleActivityClick,
    handleActivityUpdate,
    handleActivityMove,
    handleActivityDelete,
    handleReorderActivities,
    closeActivityModal,
    refetch,
    
    // Utilities
    getActivitiesForDay,
    getTotalDays,
    getActivityCount,
    getAiGeneratedCount,
    getManualCount,
  };
}
