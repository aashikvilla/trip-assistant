import { useEffect, useState } from 'react';

export interface GeocodedPoint {
  name: string;
  lat: number;
  lon: number;
}

const geocodeCache = new Map<string, GeocodedPoint>();
let lastRequestTime = 0;

async function geocodeLocation(location: string): Promise<GeocodedPoint | null> {
  if (geocodeCache.has(location)) {
    return geocodeCache.get(location) || null;
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const delayNeeded = Math.max(0, 1000 - timeSinceLastRequest);

  if (delayNeeded > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayNeeded));
  }

  lastRequestTime = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'User-Agent': 'vibe-trip/1.0',
        },
      },
    );

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const point: GeocodedPoint = {
        name: location,
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
      geocodeCache.set(location, point);
      return point;
    }
  } catch {
    // Geocoding failed, will be added to failed list
  }

  return null;
}

export function useGeocoder(locations: string[]) {
  const [results, setResults] = useState<GeocodedPoint[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const geocodeAll = async () => {
      setLoading(true);
      const resolved: GeocodedPoint[] = [];
      const unresolved: string[] = [];

      for (const location of locations) {
        const point = await geocodeLocation(location);
        if (point) {
          resolved.push(point);
        } else {
          unresolved.push(location);
        }
      }

      setResults(resolved);
      setFailed(unresolved);
      setLoading(false);
    };

    if (locations.length > 0) {
      geocodeAll();
    } else {
      setResults([]);
      setFailed([]);
      setLoading(false);
    }
  }, [locations]);

  return { results, failed, loading };
}
