# Requirements Document

## Introduction

The itinerary map view adds a "Map" tab to the existing `ItineraryCalendar` component in the group travel planning app. It provides two levels of geographic visualization: a high-level overview map showing all trip destinations connected by travel route lines, and a day-level map showing numbered activity pins for a specific day with optional routing between them. The feature uses Leaflet.js with OpenStreetMap tiles — no paid API keys required.

## Glossary

- **Map_View**: The new "Map" tab added alongside Day/Week/List in `ItineraryCalendar`
- **Overview_Map**: The map rendered when no specific day is selected, showing all trip destinations
- **Day_Map**: The map rendered when a specific day is selected, showing that day's activity locations
- **Destination_Pin**: A map marker representing a city/destination in the trip's `destinations` array
- **Activity_Pin**: A numbered map marker representing a single `EnhancedItineraryItem` with a `location` field
- **Route_Line**: A polyline drawn between consecutive pins to indicate travel order
- **Geocoder**: The client-side service that resolves location name strings to latitude/longitude coordinates using the Nominatim API
- **Activity_Popup**: The tooltip/popup shown when a user clicks an Activity_Pin or Destination_Pin
- **ItineraryCalendar**: The existing calendar component at `src/components/calendar/ItineraryCalendar.tsx`
- **EnhancedItineraryItem**: The existing activity data type with fields including `location`, `day_number`, `time_slot`, `activity_type`, `activity_name`, `description`
- **EnhancedTripData**: The existing trip data type with `destinations`, `start_date`, `end_date` fields

## Requirements

### Requirement 1: Map Tab Integration

**User Story:** As a trip member, I want a Map tab in the itinerary calendar, so that I can switch between calendar views and the map without leaving the itinerary section.

#### Acceptance Criteria

1. THE `ItineraryCalendar` SHALL render a "Map" tab button alongside the existing Day, Week, and List tab buttons.
2. WHEN the user clicks the Map tab, THE `ItineraryCalendar` SHALL display the `Map_View` and hide the Day/Week/List content.
3. WHEN the user clicks any non-Map tab while `Map_View` is active, THE `ItineraryCalendar` SHALL hide the `Map_View` and display the selected view's content.
4. THE `Map_View` SHALL preserve the currently selected day number when the user switches away from and back to the Map tab.

---

### Requirement 2: Overview Map — Multi-Destination Route

**User Story:** As a trip member, I want to see all my trip destinations on a map with a route line, so that I can understand the overall travel path at a glance.

#### Acceptance Criteria

1. WHEN the `Map_View` is active and no specific day is selected, THE `Overview_Map` SHALL render a Leaflet map with one `Destination_Pin` per entry in the trip's `destinations` array.
2. THE `Geocoder` SHALL resolve each destination city name to latitude/longitude coordinates using the Nominatim OpenStreetMap API before rendering pins.
3. IF a destination city name cannot be resolved by the `Geocoder`, THEN THE `Overview_Map` SHALL skip that destination and display a non-blocking warning message listing the unresolved names.
4. WHEN the `destinations` array contains two or more successfully geocoded entries, THE `Overview_Map` SHALL draw a `Route_Line` connecting the `Destination_Pin` markers in the order they appear in the `destinations` array.
5. THE `Overview_Map` SHALL auto-fit its viewport bounds to contain all rendered `Destination_Pin` markers with appropriate padding.
6. WHEN a user clicks a `Destination_Pin`, THE `Overview_Map` SHALL display an `Activity_Popup` showing the destination city name.

---

### Requirement 3: Day Map — Activity Locations

**User Story:** As a trip member, I want to see all activity locations for a specific day on a map with numbered markers, so that I can understand the spatial layout of my day's plan.

#### Acceptance Criteria

1. WHEN the `Map_View` is active and a specific day is selected, THE `Day_Map` SHALL render a Leaflet map showing only the activities for that day that have a non-empty `location` field.
2. THE `Geocoder` SHALL resolve each activity's `location` string to latitude/longitude coordinates using the Nominatim OpenStreetMap API.
3. IF an activity's `location` cannot be resolved by the `Geocoder`, THEN THE `Day_Map` SHALL skip that activity's pin and display a non-blocking warning listing the unresolved activity names.
4. THE `Day_Map` SHALL render each successfully geocoded activity as an `Activity_Pin` with a numeric label corresponding to its chronological order within the day, sorted by `time_slot`.
5. WHEN the `Day_Map` has two or more `Activity_Pin` markers, THE `Day_Map` SHALL draw a `Route_Line` connecting the pins in chronological order.
6. THE `Day_Map` SHALL auto-fit its viewport bounds to contain all rendered `Activity_Pin` markers with appropriate padding.
7. WHEN a user clicks an `Activity_Pin`, THE `Day_Map` SHALL display an `Activity_Popup` showing the activity's `activity_name`, `time_slot`, `activity_type`, and `description`.
8. WHEN a day has no activities with a resolvable `location`, THE `Day_Map` SHALL display a placeholder message indicating no mappable locations are available for that day.

---

### Requirement 4: Day Selection Within Map View

**User Story:** As a trip member, I want to select a specific day while in Map view, so that I can switch between the overview map and individual day maps without leaving the Map tab.

#### Acceptance Criteria

1. THE `Map_View` SHALL display a day selector control showing all trip days by number and date.
2. WHEN the user selects a day from the day selector, THE `Map_View` SHALL switch from the `Overview_Map` to the `Day_Map` for the selected day.
3. WHEN the user selects an "Overview" option in the day selector, THE `Map_View` SHALL switch from the `Day_Map` to the `Overview_Map`.
4. THE `Map_View` SHALL initialize with the `Overview_Map` displayed when the trip has more than one destination.
5. WHEN the trip has exactly one destination, THE `Map_View` SHALL initialize with the `Day_Map` for day 1.

---

### Requirement 5: Geocoding Cache

**User Story:** As a trip member, I want map pins to appear quickly without redundant network requests, so that switching between days feels responsive.

#### Acceptance Criteria

1. THE `Geocoder` SHALL cache resolved coordinates for each unique location string for the duration of the browser session.
2. WHEN a location string has already been resolved in the current session, THE `Geocoder` SHALL return the cached coordinates without making a new Nominatim API request.
3. THE `Geocoder` SHALL rate-limit outgoing Nominatim requests to a maximum of one request per second to comply with the Nominatim usage policy.

---

### Requirement 6: Mobile Responsiveness

**User Story:** As a trip member on a mobile device, I want the map to be full-width and touch-friendly, so that I can interact with it comfortably on a small screen.

#### Acceptance Criteria

1. THE `Map_View` SHALL render the Leaflet map at full width of its container on all screen sizes.
2. WHEN rendered on a viewport narrower than 768px, THE `Map_View` SHALL set the map height to a minimum of 400px.
3. THE `Map_View` SHALL enable Leaflet's built-in touch zoom and drag interactions on all devices.
4. THE `Map_View` SHALL position the day selector control above the map on viewports narrower than 768px so it does not overlap the map canvas.

---

### Requirement 7: SSR Safety

**User Story:** As a developer, I want the map components to not break server-side rendering, so that the Next.js app builds and runs without errors.

#### Acceptance Criteria

1. THE `Map_View` SHALL be loaded using Next.js dynamic import with `ssr: false` to prevent Leaflet from executing during server-side rendering.
2. WHEN the `Map_View` is loading on the client, THE `ItineraryCalendar` SHALL display a skeleton placeholder of equivalent dimensions.
3. IF the Leaflet library fails to load, THEN THE `Map_View` SHALL display an error message and a link to view the itinerary in list view instead.
