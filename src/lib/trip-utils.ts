import { createClient } from "@/lib/supabase/client";
import { TripPreferences } from "@/types/trip";

/**
 * Saves trip preferences for a specific user and trip
 */
export async function saveTripPreferences(
  tripId: string,
  userId: string,
  preferences: Partial<TripPreferences>
) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('trip_preferences')
    .upsert(
      {
        trip_id: tripId,
        user_id: userId,
        preferences: {
          travel_style: preferences.travel_style || [],
          vibe: preferences.vibe || [],
          budget_level: preferences.budget_level,
          budget_amount: preferences.budget_amount,
          must_do: preferences.must_do || [],
          dietary_restrictions: preferences.dietary_restrictions || [],
          additional_notes: preferences.additional_notes || '',
        },
      },
      { onConflict: 'trip_id,user_id' }
    )
    .select();

  if (error) {
    console.error('Error saving trip preferences:', error);
    throw error;
  }

  return data?.[0];
}

/**
 * Fetches trip preferences for a specific user and trip
 */
export async function getTripPreferences(tripId: string, userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('trip_preferences')
    .select('preferences')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.error('Error fetching trip preferences:', error);
    throw error;
  }

  return data?.preferences || null;
}

/**
 * Formats preferences for AI processing
 */
export function formatPreferencesForAI(preferences: Partial<TripPreferences>) {
  return {
    travel_style: preferences.travel_style || [],
    vibe: preferences.vibe || [],
    budget: {
      level: preferences.budget_level,
      amount: preferences.budget_amount,
    },
    must_do: preferences.must_do || [],
    dietary_restrictions: preferences.dietary_restrictions || [],
    additional_notes: preferences.additional_notes || '',
  };
}
