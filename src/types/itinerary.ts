import { TravelStyle, TripVibe, Budget } from './enums';

export interface EnhancedItineraryRequest {
  trip_details: {
    destinations: string[];
    trip_name: string;
    trip_length_days: number;
    travel_dates: {
      start_date: string;
      end_date: string;
    };
    travel_style: TravelStyle;
    vibe: TripVibe;
    budget: Budget;
    must_do: string[];
    description: string;
  };
  travelers: Array<{
    id: string;
    interests: string[];
  }>;
  global_preferences: {
    dietary: string[];
  };
}

export interface HotelRecommendation {
  name: string;
  location: string;
  description: string;
  link: string;
}

export interface LocalTravelInfo {
  tips: string[];
  weather_advice: string;
}

export interface ActivityDetail {
  time_slot: string;
  activity_name: string;
  description: string;
  trivia?: string;
  food_suggestion?: string;
  link?: string;
}

export interface DayItinerary {
  day_number: number;
  title: string;
  activities: ActivityDetail[];
}

export interface EnhancedItineraryResponse {
  output: {
    hotel_recommendations: HotelRecommendation[];
    local_travel: LocalTravelInfo;
    itinerary: DayItinerary[];
    closing_note: string;
  };
}

// Job tracking interface
export interface ItineraryGenerationJob {
  id: string;
  trip_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
