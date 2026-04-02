'use client';

import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useGeocoder } from '@/hooks/useGeocoder';
import { createNumberedIcon } from './markerIcon';
import { FitBounds } from './FitBounds';
import { Skeleton } from '@/components/ui/skeleton';
import { ACTIVITY_TYPE_COLORS, type EnhancedItineraryItem } from '@/types/trip';
import L from 'leaflet';

interface DayMapProps {
  dayNumber: number;
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}

export function DayMap({ dayNumber, activities, onActivityClick }: DayMapProps) {
  const dayActivities = activities
    .filter((a) => a.day_number === dayNumber && a.location)
    .sort((a, b) => {
      const timeA = a.time_slot?.split(' - ')[0] || '00:00';
      const timeB = b.time_slot?.split(' - ')[0] || '00:00';
      return timeA.localeCompare(timeB);
    });

  const locations = dayActivities.map((a) => a.location!);
  const { results, failed, loading } = useGeocoder(locations);

  if (loading) {
    return <Skeleton className="w-full h-[400px] md:h-[560px] rounded-lg" />;
  }

  if (dayActivities.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[560px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
        No activities with locations for this day
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[560px] rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
        Could not resolve activity locations: {failed.join(', ')}
      </div>
    );
  }

  const bounds = L.latLngBounds(results.map((r) => [r.lat, r.lon]));
  const activityMap = new Map(dayActivities.map((a, idx) => [a.location!, { activity: a, number: idx + 1 }]));

  return (
    <div className="w-full">
      <MapContainer
        center={[results[0].lat, results[0].lon]}
        zoom={12}
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg md:h-[560px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {results.map((point) => {
          const data = activityMap.get(point.name);
          if (!data) return null;

          const { activity, number } = data;
          const color = ACTIVITY_TYPE_COLORS[activity.activity_type];

          return (
            <Marker
              key={activity.id}
              position={[point.lat, point.lon]}
              icon={createNumberedIcon(number, color)}
              eventHandlers={{
                click: () => onActivityClick?.(activity),
              }}
            >
              <Popup>
                <div className="text-sm font-semibold">{activity.activity_name}</div>
                <div className="text-xs text-gray-600">{activity.time_slot}</div>
                <div className="text-xs text-gray-600">{activity.activity_type}</div>
                {activity.description && <div className="text-xs mt-1">{activity.description}</div>}
              </Popup>
            </Marker>
          );
        })}

        {results.length >= 2 && (
          <Polyline positions={results.map((r) => [r.lat, r.lon])} color="#3b82f6" weight={3} />
        )}

        <FitBounds bounds={bounds} />
      </MapContainer>

      {failed.length > 0 && (
        <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
          Could not resolve: {failed.join(', ')}
        </div>
      )}
    </div>
  );
}
