# Trip Preferences Feature

## Overview
The Trip Preferences feature allows users to specify their travel preferences when creating or editing a trip. This information helps generate more personalized itinerary recommendations.

## Features

- **Travel Style Selection**: Choose from predefined travel styles (solo, couple, family, etc.)
- **Vibe Selection**: Select preferred trip vibes with emoji picker
- **Budget Management**: Set budget level and custom amount with currency formatting
- **Must-Do Activities**: Add and manage activities you want to include
- **Dietary Restrictions**: Specify any dietary requirements
- **Additional Notes**: Add any special requests or notes

## Components

### `TripPreferencesForm`
The main form component that handles all user inputs and validation.

#### Props
```typescript
interface TripPreferencesFormProps {
  defaultValues?: Partial<TripPreferences>;
  onSubmit: (values: TripPreferences) => Promise<void>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  className?: string;
}
```

### `TripPreferencesSection`
A container component that handles data fetching and state management.

#### Props
```typescript
interface TripPreferencesSectionProps {
  tripId: string;
  userId: string;
  className?: string;
}
```

## Hooks

### `useTripPreferences`
Manages the trip preferences state and API calls.

```typescript
const {
  preferences,    // Current preferences
  isLoading,      // Loading state
  isSubmitting,   // Form submission state
  updatePreferences, // Update preferences locally
  savePreferences,   // Save preferences to server
} = useTripPreferences(tripId, userId);
```

## Database Schema

The `trip_preferences` table stores all user preferences:

```sql
CREATE TABLE public.trip_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_preferences_trip_id_user_id_key UNIQUE (trip_id, user_id)
);
```

## Security

- Row Level Security (RLS) is enabled
- Users can only view and modify their own preferences
- Trip members can view each other's preferences
- All database operations are validated and typed

## Testing

### Unit Tests
- Test hook behavior and state management
- Test form validation rules
- Test utility functions

### Integration Tests
- Test form submission flow
- Test error handling
- Test data persistence

## Usage Example

```tsx
import { TripPreferencesSection } from '@/components/trip/TripPreferencesSection';

function TripPage({ tripId, userId }) {
  return (
    <div className="space-y-6">
      <h1>Trip Preferences</h1>
      <TripPreferencesSection 
        tripId={tripId} 
        userId={userId} 
        className="max-w-2xl" 
      />
    </div>
  );
}
```

## Error Handling

- Form validation errors are displayed inline
- API errors are shown as toast notifications
- Loading states prevent duplicate submissions
- Network errors are automatically retried

## Performance Considerations

- Preferences are cached using React Query
- Form state is optimized with React Hook Form
- Database queries are properly indexed
- Large preference objects are handled efficiently with JSONB
