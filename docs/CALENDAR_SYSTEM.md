# Calendar System Documentation

## Overview
The Calendar System provides a comprehensive, responsive interface for viewing and managing trip itineraries. It features custom-built components optimized for both desktop and mobile experiences.

## Architecture

### Core Components

#### `ResponsiveItineraryCalendar`
Main entry point that automatically switches between desktop and mobile views based on screen size.

```tsx
import { ResponsiveItineraryCalendar } from '@/components/calendar/ResponsiveItineraryCalendar';

<ResponsiveItineraryCalendar
  tripId="trip-123"
  startDate="2024-06-01"
  endDate="2024-06-07"
  onAddActivity={(dayNumber, timeSlot) => handleAddActivity(dayNumber, timeSlot)}
/>
```

#### `ItineraryCalendar` (Desktop)
Full-featured desktop calendar with day, week, and list views.

**Features:**
- Multiple view modes (day/week/list)
- Drag & drop activity reordering
- Time slot visualization
- Activity statistics
- Navigation controls

#### `MobileCalendarView` (Mobile)
Touch-optimized mobile interface with swipe navigation.

**Features:**
- Swipe navigation between days
- Touch-friendly activity cards
- Timeline grouping
- Optimized scrolling
- Day indicator dots

#### `DayView`
Detailed day view with time slots from 6 AM to 11 PM.

**Features:**
- Hourly time slots
- Drag & drop between slots
- Unscheduled activities section
- Add activity buttons
- Visual time indicators

#### `WeekView`
Overview of all trip days with activity summaries.

**Features:**
- Grid layout of all days
- Activity count badges
- Activity type breakdown
- Click to navigate to day
- Visual activity previews

#### `ActivityCard`
Reusable component for displaying activity information.

**Features:**
- Color-coded by activity type
- Time and location display
- Status indicators (booking, weather)
- External link handling
- Responsive design

#### `ActivityDetailModal`
Full-screen modal for viewing and editing activity details.

**Features:**
- Complete activity information
- Inline editing capabilities
- Validation and error handling
- Delete confirmation
- External link integration

### Data Management

#### `useItineraryCalendar` Hook
Central hook for managing calendar state and API interactions.

```tsx
const {
  activities,
  activitiesByDay,
  selectedActivity,
  isActivityModalOpen,
  handleActivityClick,
  handleActivityUpdate,
  handleActivityMove,
  handleActivityDelete,
  closeActivityModal
} = useItineraryCalendar({ tripId, filter });
```

**Features:**
- React Query integration
- Optimistic updates
- Error handling with toasts
- Activity grouping and sorting
- Statistics calculation

#### `enhancedItineraryService`
Service layer for API operations.

**Methods:**
- `getEnhancedItineraryItems()` - Fetch activities with filtering
- `updateItineraryItem()` - Update single activity
- `deleteItineraryItem()` - Delete activity
- `moveActivityToDay()` - Move activity between days
- `reorderActivitiesInDay()` - Reorder activities within day
- `bulkCreateItineraryItems()` - Bulk insert activities
- `getTripStatistics()` - Get trip statistics

## Mobile Optimizations

### Touch Gestures
- **Swipe Left/Right**: Navigate between days
- **Tap**: Select activity or open details
- **Long Press**: Context menu (future enhancement)

### Responsive Design
- Automatic layout switching at 768px breakpoint
- Touch-friendly button sizes (minimum 44px)
- Optimized scrolling areas
- Reduced visual complexity on small screens

### Performance
- Virtualized scrolling for large activity lists
- Lazy loading of activity details
- Optimized re-renders with React.memo
- Efficient date calculations

## Styling and Theming

### Color System
Activities are color-coded by type using `ACTIVITY_TYPE_COLORS`:
- **Sightseeing**: Blue (#3B82F6)
- **Dining**: Red (#EF4444)
- **Entertainment**: Purple (#8B5CF6)
- **Shopping**: Amber (#F59E0B)
- **Outdoor**: Emerald (#10B981)
- **Cultural**: Indigo (#6366F1)
- **Relaxation**: Cyan (#06B6D4)
- **Transportation**: Gray (#6B7280)
- **Accommodation**: Lime (#84CC16)

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Data Validation

### Activity Validation
```tsx
import { validateItineraryItem } from '@/lib/validation';

const result = validateItineraryItem(activityData);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
```

### Supported Validations
- Required fields (name, day, description)
- Time slot format validation
- URL validation for external links
- Duration range validation
- Activity type enum validation

## Error Handling

### User-Friendly Messages
- Network errors with retry options
- Validation errors with specific field feedback
- Success confirmations for all actions
- Loading states during operations

### Fallback States
- Empty state illustrations
- Error boundaries for component crashes
- Graceful degradation for missing data
- Offline capability indicators

## Performance Considerations

### Optimization Strategies
- React Query caching (5-10 minute stale times)
- Memoized calculations for activity grouping
- Debounced search and filtering
- Lazy loading of non-critical components

### Bundle Size
- Custom components instead of heavy libraries
- Tree-shaking compatible exports
- Dynamic imports for modal components
- Optimized icon usage

## Accessibility

### WCAG Compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast color ratios
- Focus management in modals

### Semantic HTML
- Proper heading hierarchy
- ARIA labels and descriptions
- Role attributes for interactive elements
- Alt text for visual indicators

## Testing Strategy

### Unit Tests
- Component rendering
- Hook behavior
- Utility functions
- Validation logic

### Integration Tests
- Calendar navigation
- Activity CRUD operations
- Drag & drop functionality
- Modal interactions

### E2E Tests
- Complete user workflows
- Mobile gesture testing
- Cross-browser compatibility
- Performance benchmarks

## Future Enhancements

### Planned Features
- Offline synchronization
- Calendar export (iCal)
- Activity templates
- Collaborative editing
- Advanced filtering
- Custom time zones
- Recurring activities

### Performance Improvements
- Virtual scrolling for large datasets
- Service worker caching
- Progressive loading
- Image optimization

## Usage Examples

### Basic Implementation
```tsx
import { ResponsiveItineraryCalendar } from '@/components/calendar';

function TripPage({ trip }) {
  const handleAddActivity = (dayNumber, timeSlot) => {
    // Handle activity creation
  };

  return (
    <ResponsiveItineraryCalendar
      tripId={trip.id}
      startDate={trip.start_date}
      endDate={trip.end_date}
      onAddActivity={handleAddActivity}
    />
  );
}
```

### With Filtering
```tsx
const filter = {
  activityTypes: [ActivityType.SIGHTSEEING, ActivityType.CULTURAL],
  isAiGenerated: true,
  dayNumbers: [1, 2, 3]
};

<ResponsiveItineraryCalendar
  tripId={tripId}
  startDate={startDate}
  endDate={endDate}
  filter={filter}
/>
```

### Custom Event Handlers
```tsx
<ResponsiveItineraryCalendar
  tripId={tripId}
  startDate={startDate}
  endDate={endDate}
  onAddActivity={(day, slot) => openActivityForm(day, slot)}
  className="custom-calendar"
/>
```
