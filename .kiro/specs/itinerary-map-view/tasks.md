# Tasks

## Task List

- [ ] 1. Install dependencies
  - [ ] 1.1 Add `leaflet`, `@types/leaflet`, and `react-leaflet` to package.json dependencies
  - [ ] 1.2 Verify the packages resolve without peer-dependency conflicts with React 18

- [ ] 2. Geocoding hook
  - [ ] 2.1 Create `src/hooks/useGeocoder.ts` with module-level session cache (`Map<string, GeocodedPoint>`)
  - [ ] 2.2 Implement sequential Nominatim fetch with 1-second rate limiting between uncached requests
  - [ ] 2.3 Return `{ results: GeocodedPoint[], failed: string[], loading: boolean }` from the hook

- [ ] 3. Marker icon factory
  - [ ] 3.1 Create `src/components/calendar/map/markerIcon.ts` with `createNumberedIcon(n, color)` using `L.divIcon`
  - [ ] 3.2 Add `createDestinationIcon(label)` for overview map city pins

- [ ] 4. FitBounds helper component
  - [ ] 4.1 Create `src/components/calendar/map/FitBounds.tsx` using `useMap()` from react-leaflet
  - [ ] 4.2 Call `map.fitBounds(bounds, { padding: [40, 40] })` whenever the bounds prop changes

- [ ] 5. OverviewMap component
  - [ ] 5.1 Create `src/components/calendar/map/OverviewMap.tsx`
  - [ ] 5.2 Call `useGeocoder(destinations)` and render a `<MapContainer>` with OpenStreetMap `<TileLayer>`
  - [ ] 5.3 Render one `<Marker>` per resolved destination using `createDestinationIcon`
  - [ ] 5.4 Render a `<Polyline>` connecting markers in `destinations` array order when ≥ 2 resolved
  - [ ] 5.5 Include `<FitBounds>` to auto-fit viewport to all markers
  - [ ] 5.6 Show inline warning text listing any unresolved destination names
  - [ ] 5.7 Show a loading skeleton while geocoding is in progress

- [ ] 6. DayMap component
  - [ ] 6.1 Create `src/components/calendar/map/DayMap.tsx`
  - [ ] 6.2 Filter incoming activities to those with non-empty `location`, sorted by `time_slot`
  - [ ] 6.3 Call `useGeocoder(locationStrings)` for the filtered activities
  - [ ] 6.4 Render numbered `<Marker>` icons using `createNumberedIcon` with `ACTIVITY_TYPE_COLORS`
  - [ ] 6.5 Render a `<Polyline>` connecting markers in chronological order when ≥ 2 resolved
  - [ ] 6.6 Add a `<Popup>` to each marker showing `activity_name`, `time_slot`, `activity_type`, `description`
  - [ ] 6.7 Call `onActivityClick` prop when a marker popup is opened
  - [ ] 6.8 Include `<FitBounds>` to auto-fit viewport
  - [ ] 6.9 Show empty state message when no activities have a resolvable location
  - [ ] 6.10 Show inline warning for activities whose location could not be geocoded

- [ ] 7. MapView component
  - [ ] 7.1 Create `src/components/calendar/MapView.tsx` with `import 'leaflet/dist/leaflet.css'`
  - [ ] 7.2 Accept props: `tripId`, `startDate`, `endDate`, `destinations`, `activities`, `onActivityClick`
  - [ ] 7.3 Implement `selectedDay: number | null` state (null = overview; initialize based on destinations count)
  - [ ] 7.4 Render a scrollable day selector row with an "Overview" pill and one pill per trip day
  - [ ] 7.5 Render `<OverviewMap>` when `selectedDay` is null, `<DayMap>` otherwise
  - [ ] 7.6 Apply responsive height: `h-[400px] md:h-[560px]` to the map container

- [ ] 8. MapViewWrapper (SSR-safe dynamic import)
  - [ ] 8.1 Create `src/components/calendar/MapViewWrapper.tsx` using `next/dynamic` with `ssr: false`
  - [ ] 8.2 Render a `<Skeleton className="w-full h-[500px] rounded-lg" />` as the loading fallback
  - [ ] 8.3 Catch and display an error boundary message if Leaflet fails to load

- [ ] 9. ItineraryCalendar integration
  - [ ] 9.1 Add `'map'` to the `ViewType` union in `ItineraryCalendar.tsx`
  - [ ] 9.2 Add a Map tab button (with a `Map` icon from lucide-react) to the view controls
  - [ ] 9.3 Render `<MapViewWrapper>` when `currentView === 'map'`, passing `destinations` and all existing props
  - [ ] 9.4 Hide the day navigation bar when `currentView === 'map'`
  - [ ] 9.5 Ensure `ItineraryCalendarProps` accepts an optional `destinations?: string[]` prop (or source it from a parent)

- [ ] 10. Verify and polish
  - [ ] 10.1 Run `getDiagnostics` on all new and modified files and fix any TypeScript errors
  - [ ] 10.2 Confirm the Leaflet default icon broken-image issue does not occur (DivIcon-only approach)
  - [ ] 10.3 Test on a narrow viewport (< 768px) that the day selector wraps above the map without overlap
  - [ ] 10.4 Confirm Nominatim requests include a valid `User-Agent` header to comply with usage policy
