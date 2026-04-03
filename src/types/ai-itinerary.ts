// AI itinerary request and response types

export interface TripDetails {
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
  activity_level?: 'light' | 'moderate' | 'active';
  must_do: string[];
  description: string;
}

export type Traveler = {
  id: string;
  interests: string[];
  dietary_restrictions: string[];
  [key: string]: string | string[] | number | boolean | undefined | null | Record<string, unknown>;
};

export interface GlobalPreferences {
  dietary: string[];
}

export interface ItineraryRequest {
  trip_details: TripDetails;
  travelers: Traveler[];
  global_preferences: GlobalPreferences;
}

export interface HotelRecommendation {
  name: string;
  location: string;
  description: string;
  link?: string;
}

export interface ItineraryActivity {
  time_slot: string;
  activity_name: string;
  description: string;
  food_suggestion?: string | null;
  link?: string;
}

export interface ItineraryDay {
  day_number: number;
  title: string;
  activities: ItineraryActivity[];
}

export interface ItineraryOutput {
  hotel_recommendations: HotelRecommendation[];
  itinerary: ItineraryDay[];
  closing_note: string;
}

export interface ItineraryResponse {
  output: ItineraryOutput;
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
