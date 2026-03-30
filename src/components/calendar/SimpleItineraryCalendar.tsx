import React from 'react';
import { SimpleItineraryDisplay } from './SimpleItineraryDisplay';
import { useSimpleItineraryCalendar } from '@/hooks/useSimpleItineraryCalendar';
import type { Tables } from '@/integrations/supabase/types';

interface SimpleItineraryCalendarProps {
  tripId: string;
  startDate?: string;
  onSelect?: (item: Tables<'itinerary_items'>) => void;
}

export function SimpleItineraryCalendar({ tripId, startDate, onSelect }: SimpleItineraryCalendarProps) {
  const { activities, isLoading } = useSimpleItineraryCalendar({ tripId });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-32 bg-muted rounded"></div>
      </div>
    );
  }

  return <SimpleItineraryDisplay activities={activities} startDate={startDate} onSelect={onSelect} />;
}
