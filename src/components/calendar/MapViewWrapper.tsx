'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { type EnhancedItineraryItem } from '@/types/trip';

const MapView = dynamic(() => import('./MapView').then((mod) => ({ default: mod.MapView })), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px] rounded-lg" />,
});

interface MapViewWrapperProps {
  tripId: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}

export function MapViewWrapper({
  tripId,
  startDate,
  endDate,
  destinations,
  activities,
  onActivityClick,
}: MapViewWrapperProps) {
  return (
    <MapView
      tripId={tripId}
      startDate={startDate}
      endDate={endDate}
      destinations={destinations}
      activities={activities}
      onActivityClick={onActivityClick}
    />
  );
}
