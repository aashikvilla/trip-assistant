# Design Document

## Overview

The itinerary map view adds a "Map" tab to `ItineraryCalendar` using Leaflet.js + OpenStreetMap (no API key). It renders two map modes: an overview map for multi-city routes and a day map with numbered activity pins. Leaflet is dynamically imported to avoid SSR issues in Next.js 14.

## Architecture

```
ItineraryCalendar (existing)
  └── MapViewWrapper          ← dynamic import (ssr: false), renders skeleton while loading
        └── MapView           ← day selector + map switcher
              ├── OverviewMap ← Leaflet map with destination pins + route line
              └── DayMap      ← Leaflet map with numbered activity pins + route line
                    └── ActivityPopup (Leaflet popup content)

useGeocoder (hook)            ← Nominatim geocoding with session cache + rate limiting
```

### Key Dependencies

- `leaflet` + `@types/leaflet` — map rendering
- `react-leaflet` — React bindings for Leaflet
- Nominatim API (`https://nominatim.openstreetmap.org/search`) — free geocoding, no key required

## Component Design

### 1. `ItineraryCalendar` changes

Add `'map'` to the `ViewType` union and a Map tab button. When `currentView === 'map'`, render `<MapViewWrapper>` instead of the existing view components. The day navigation bar is hidden in map view (day selection is handled inside `MapView`).

```ts
type ViewType = 'day' | 'week' | 'list' | 'map';
```

### 2. `MapViewWrapper` — `src/components/calendar/MapViewWrapper.tsx`

A thin Next.js dynamic import wrapper:

```tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[500px] rounded-lg" />,
});

export { MapView as MapViewWrapper };
```

### 3. `MapView` — `src/components/calendar/MapView.tsx`

Props:
```ts
interface MapViewProps {
  tripId: string;
  startDate: string;
  endDate: string;
  destinations: string[];          // from EnhancedTripData
  activities: EnhancedItineraryItem[];
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}
```

State:
- `selectedDay: number | null` — `null` = overview, `1..N` = day map
- Initializes to `null` if `destinations.length > 1`, else `1`

Renders a day selector (scrollable pill row) above the map. Passes the appropriate props to `<OverviewMap>` or `<DayMap>`.

### 4. `OverviewMap` — `src/components/calendar/map/OverviewMap.tsx`

```ts
interface OverviewMapProps {
  destinations: string[];
}
```

- Calls `useGeocoder(destinations)` to get `GeocodedPoint[]`
- Renders `<MapContainer>` with `<TileLayer>` (OpenStreetMap)
- One `<Marker>` per resolved destination with a custom `DivIcon` (city name label)
- A `<Polyline>` connecting markers in order when ≥ 2 resolved
- Uses `<FitBounds>` helper component to auto-fit viewport
- Shows inline warning for unresolved destinations

### 5. `DayMap` — `src/components/calendar/map/DayMap.tsx`

```ts
interface DayMapProps {
  dayNumber: number;
  activities: EnhancedItineraryItem[];   // pre-filtered to this day, sorted by time_slot
  onActivityClick?: (activity: EnhancedItineraryItem) => void;
}
```

- Filters activities to those with non-empty `location`
- Calls `useGeocoder(locationStrings)` to get coordinates
- Renders numbered `<Marker>` icons (1, 2, 3…) using `DivIcon`
- A `<Polyline>` connecting markers in chronological order when ≥ 2
- Each marker opens a `<Popup>` with activity details on click; also calls `onActivityClick`
- Shows empty state when no mappable locations

### 6. `useGeocoder` hook — `src/hooks/useGeocoder.ts`

```ts
interface GeocodedPoint {
  query: string;
  lat: number;
  lng: number;
}

function useGeocoder(queries: string[]): {
  results: GeocodedPoint[];
  failed: string[];
  loading: boolean;
}
```

Implementation details:
- Module-level `Map<string, GeocodedPoint>` as session cache (persists across re-renders)
- Processes queries sequentially with 1 second delay between uncached requests (Nominatim rate limit)
- Nominatim endpoint: `GET https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1`
- Sets `User-Agent` header: `itinerary-map-view/1.0`
- Returns `failed[]` for queries that returned no results or errored

### 7. `FitBounds` helper — `src/components/calendar/map/FitBounds.tsx`

A render-null component that calls `map.fitBounds(bounds, { padding: [40, 40] })` via `useMap()` whenever the bounds change. Used by both `OverviewMap` and `DayMap`.

### 8. Numbered marker icon factory

```ts
// src/components/calendar/map/markerIcon.ts
import L from 'leaflet';

export function createNumberedIcon(n: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#fff;border-radius:50%;
                width:28px;height:28px;display:flex;align-items:center;
                justify-content:center;font-weight:700;font-size:13px;
                border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">
             ${n}
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function createDestinationIcon(label: string): L.DivIcon { ... }
```

Activity type colors reuse `ACTIVITY_TYPE_COLORS` from `src/types/trip.ts`.

## Data Flow

```
ItineraryCalendar
  │  props: activities[], startDate, endDate, destinations[]
  │
  └─► MapView
        │  selectedDay = null → OverviewMap(destinations)
        │  selectedDay = N   → DayMap(activitiesByDay[N])
        │
        ├─► useGeocoder(["Paris", "Rome", ...])
        │     → fetches Nominatim sequentially, caches in module Map
        │     → returns { results, failed, loading }
        │
        └─► react-leaflet MapContainer
              TileLayer: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
              Markers + Polyline + Popups
              FitBounds (auto-zoom)
```

## Leaflet CSS

Leaflet requires its CSS to be imported. In Next.js App Router, import it in the map component file (not in a Server Component):

```ts
// inside MapView.tsx (client component)
import 'leaflet/dist/leaflet.css';
```

The default Leaflet marker icon image paths break in webpack. Fix by importing the icon images explicitly and setting `L.Icon.Default.mergeOptions` — or by using only `DivIcon` (which this design does, avoiding the issue entirely).

## Mobile Layout

- Map container: `w-full`, height `h-[400px] md:h-[560px]`
- Day selector: `flex flex-wrap gap-2 mb-3` — wraps naturally on small screens
- Leaflet touch handlers are enabled by default; no extra config needed

## Correctness Properties

1. Round-trip geocoding cache: for any location string `q`, if `useGeocoder([q])` resolves successfully, a second call with the same `q` returns identical coordinates without a network request.
2. Marker count invariant: the number of rendered `Activity_Pin` markers equals the number of activities in the selected day that have a non-empty `location` AND were successfully geocoded.
3. Route line order: the `Polyline` positions array is always in the same order as the sorted-by-`time_slot` activities array (for `DayMap`) or the `destinations` array order (for `OverviewMap`).
4. SSR safety: the `MapViewWrapper` dynamic import with `ssr: false` ensures Leaflet (which references `window`) is never executed during server rendering.

## File Structure

```
src/
  components/calendar/
    ItineraryCalendar.tsx        ← modified: add 'map' ViewType + MapViewWrapper
    MapViewWrapper.tsx           ← new: dynamic import wrapper
    MapView.tsx                  ← new: day selector + map switcher
    map/
      OverviewMap.tsx            ← new
      DayMap.tsx                 ← new
      FitBounds.tsx              ← new
      markerIcon.ts              ← new
  hooks/
    useGeocoder.ts               ← new
```
