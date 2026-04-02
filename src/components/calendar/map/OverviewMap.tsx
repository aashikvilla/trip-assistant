'use client';

import 'leaflet/dist/leaflet.css';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useGeocoder } from '@/hooks/useGeocoder';
import { createDestinationIcon } from './markerIcon';
import { FitBounds } from './FitBounds';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';

interface OverviewMapProps {
  destinations: string[];
}

export function OverviewMap({ destinations }: OverviewMapProps) {
  const { results, failed, loading } = useGeocoder(destinations);

  if (loading) {
    return <Skeleton className="w-full h-[400px] md:h-[560px] rounded-lg" />;
  }

  const bounds = results.length > 0 ? L.latLngBounds(results.map((r) => [r.lat, r.lon])) : null;

  return (
    <div className="w-full">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '400px', width: '100%' }}
        className="rounded-lg md:h-[560px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {results.map((point, idx) => (
          <Marker
            key={point.name}
            position={[point.lat, point.lon]}
            icon={createDestinationIcon(point.name)}
          >
            <Popup>{point.name}</Popup>
          </Marker>
        ))}

        {results.length >= 2 && (
          <Polyline positions={results.map((r) => [r.lat, r.lon])} color="#3b82f6" weight={3} />
        )}

        {bounds && <FitBounds bounds={bounds} />}
      </MapContainer>

      {failed.length > 0 && (
        <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
          Could not resolve: {failed.join(', ')}
        </div>
      )}
    </div>
  );
}
