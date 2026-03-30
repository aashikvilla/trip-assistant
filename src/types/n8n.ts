// Comprehensive N8N request and response types

export interface N8NTripDetails {
  destinations: string[];
  trip_name: string;
  trip_length_days: number;
  travel_dates: {
    start_date: string;
    end_date: string;
  };
  travel_style: string;
  vibe: string;
  budget: 'low' | 'mid' | 'high';
  activity?: 'light' | 'moderate' | 'active';
  // Optional duplicate field for workflows expecting `activity_level`
  activity_level?: 'light' | 'moderate' | 'active';
  must_do: string[];
  description: string;
}

// Define the N8NTraveler type with all possible property types
export type N8NTraveler = {
  id: string;
  interests: string[];
  dietary_restrictions: string[];
  [key: string]: string | string[] | number | boolean | undefined | null | Record<string, unknown>;
};

export interface N8NGlobalPreferences {
  dietary: string[];
}

export interface N8NComprehensiveRequest {
  trip_details: N8NTripDetails;
  travelers: N8NTraveler[];
  global_preferences: N8NGlobalPreferences;
}

export interface N8NHotelRecommendation {
  name: string;
  location: string;
  description: string;
  link?: string;
}

export interface N8NActivity {
  time_slot: string;
  activity_name: string;
  description: string;
  food_suggestion?: string | null;
  link?: string;
}

export interface N8NItineraryDay {
  day_number: number;
  title: string;
  activities: N8NActivity[];
}

export interface N8NComprehensiveOutput {
  hotel_recommendations: N8NHotelRecommendation[];
  itinerary: N8NItineraryDay[];
  closing_note: string;
}

export interface N8NComprehensiveResponse {
  output: N8NComprehensiveOutput;
}

// Database mapping types
export interface TripData {
  id: string;
  name: string;
  destination_main: string;
  start_date: string;
  end_date: string;
  description?: string;
  travel_style?: string;
  vibe?: string;
  budget?: 'low' | 'mid' | 'high';
  activity_level?: 'light' | 'moderate' | 'active';
  must_do_activities?: string[];
  dietary_preferences?: string[];
}

export interface TripMemberWithProfile {
  profile_id: string;
  profiles: {
    id: string;
    preferences?: unknown;
  };
}
