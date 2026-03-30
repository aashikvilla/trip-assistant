import { supabase } from '@/integrations/supabase/client';
import { EnhancedN8NRequest } from '@/types/itinerary';
import { TravelStyle, TripVibe, Budget } from '@/types/enums';
import { Tables } from '@/integrations/supabase/types';

type Trip = Tables<'trips'>;
type Profile = Tables<'profiles'>;

/**
 * Aggregates dietary preferences from all accepted trip members
 */
export const aggregateMemberPreferences = async (
  tripId: string
): Promise<string[]> => {
  const { data: members, error } = await supabase
    .from("trip_members")
    .select(`
      profile_id,
      profiles!inner(preferences)
    `)
    .eq("trip_id", tripId)
    .eq("invitation_status", "accepted");

  if (error) {
    console.error('Error fetching trip members:', error);
    return [];
  }

  const allDietaryPreferences = new Set<string>();

  members?.forEach((member) => {
    const memberData = member as { profiles?: { preferences?: { dietary?: string[] } } };
    const preferences = memberData.profiles?.preferences;
    if (preferences?.dietary && Array.isArray(preferences.dietary)) {
      preferences.dietary.forEach((pref: string) => {
        allDietaryPreferences.add(pref.toLowerCase().trim());
      });
    }
  });

  return Array.from(allDietaryPreferences);
};

/**
 * Gets member interests for travelers array
 */
export const getMemberInterests = async (tripId: string) => {
  const { data: members, error } = await supabase
    .from("trip_members")
    .select(`
      profile_id,
      profiles!inner(preferences, first_name)
    `)
    .eq("trip_id", tripId)
    .eq("invitation_status", "accepted");

  if (error) {
    console.error('Error fetching member interests:', error);
    return [];
  }

  return members?.map((member) => {
    const memberData = member as { profile_id: string; profiles?: { preferences?: { interests?: string[] } } };
    const profile = memberData.profiles;
    const preferences = profile?.preferences;
    const interests = preferences?.interests || [];
    
    return {
      id: member.profile_id,
      interests: Array.isArray(interests) ? interests : []
    };
  }) || [];
};

/**
 * Calculates trip length in days
 */
const calculateTripLength = (startDate: string | null, endDate: string | null): number => {
  if (!startDate || !endDate) return 1;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays);
};

/**
 * Validates and converts enum values
 */
const validateEnumValue = <T extends Record<string, string>>(
  value: string | null,
  enumObject: T,
  defaultValue: T[keyof T]
): T[keyof T] => {
  if (!value) return defaultValue;
  
  const enumValues = Object.values(enumObject);
  return enumValues.includes(value as T[keyof T]) 
    ? (value as T[keyof T]) 
    : defaultValue;
};

/**
 * Maps trip data to enhanced N8N request format
 */
export const mapTripToN8NRequest = async (
  trip: Trip
): Promise<EnhancedN8NRequest> => {
  console.log('🔄 Mapping trip to N8N request:', { tripId: trip.id, tripName: trip.name });

  // Get aggregated preferences and member interests
  const [dietaryPreferences, travelers] = await Promise.all([
    aggregateMemberPreferences(trip.id),
    getMemberInterests(trip.id)
  ]);

  // Parse destinations - handle both string and array formats
  let destinations: string[] = [];
  if (trip.destination_main) {
    try {
      // Try parsing as JSON array first
      destinations = JSON.parse(trip.destination_main);
    } catch {
      // If parsing fails, treat as single destination
      destinations = [trip.destination_main];
    }
  }

  // Parse must_do activities
  const mustDo = trip.must_do || [];

  // Calculate trip length
  const tripLengthDays = calculateTripLength(trip.start_date, trip.end_date);

  // Validate enum values with defaults
  const travelStyle = validateEnumValue(trip.travel_style, TravelStyle, TravelStyle.FRIENDS);
  const vibe = validateEnumValue(trip.vibe, TripVibe, TripVibe.RELAXED);
  const budget = validateEnumValue(trip.budget, Budget, Budget.MID);

  const enhancedRequest: EnhancedN8NRequest = {
    trip_details: {
      destinations,
      trip_name: trip.name,
      trip_length_days: tripLengthDays,
      travel_dates: {
        start_date: trip.start_date || '',
        end_date: trip.end_date || ''
      },
      travel_style: travelStyle,
      vibe,
      budget,
      must_do: mustDo,
      description: trip.description || ''
    },
    travelers,
    global_preferences: {
      dietary: dietaryPreferences
    }
  };

  console.log('✅ N8N request mapped successfully:', {
    destinations: destinations.length,
    travelers: travelers.length,
    dietaryPreferences: dietaryPreferences.length,
    travelStyle,
    vibe,
    budget
  });

  return enhancedRequest;
};
