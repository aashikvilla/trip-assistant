'use client';

import 'leaflet/dist/leaflet.css';

import { useState, useMemo } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { OverviewMap } from './map/OverviewMap';
import { DayMap } from './map/DayMap';
import { type EnhancedItineraryItem } from '@/types/trip';

interface MapViewProps {
  tripId: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}

export function MapView({
  startDate,
  endDate,
  destinations,
  activities,
  onActivityClick,
}: MapViewProps) {
  const totalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  ) + 1;

  const [selectedDay, setSelectedDay] = useState<number | null>(
    destinations.length > 1 ? null : 1,
  );

  const tripDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(parseISO(startDate), i);
      days.push({ dayNumber: i + 1, date });
    }
    return days;
  }, [startDate, totalDays]);

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedDay === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedDay(null)}
          className="whitespace-nowrap"
        >
          Overview
        </Button>

        {tripDays.map((day) => (
          <Button
            key={day.dayNumber}
            variant={selectedDay === day.dayNumber ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDay(day.dayNumber)}
            className="whitespace-nowrap"
          >
            Day {day.dayNumber} ({format(day.date, 'MMM d')})
          </Button>
        ))}
      </div>

      {selectedDay === null ? (
        <OverviewMap destinations={destinations} />
      ) : (
        <DayMap dayNumber={selectedDay} activities={activities} onActivityClick={onActivityClick} />
      )}
    </div>
  );
}
