'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface FitBoundsProps {
  bounds?: L.LatLngBoundsExpression | null;
}

export function FitBounds({ bounds }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (bounds && map) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);

  return null;
}
