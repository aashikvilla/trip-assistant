import { TravelStyle, TripVibe, Budget } from './enums';

// Trip preferences interface
export interface TripPreferences {
  travel_style: string[];
  vibe: string[];
  budget_level: string;
  budget_amount?: number;
  must_do: string[];
  dietary_restrictions: string[];
  additional_notes: string;
}

// Enhanced trip data interface
export interface EnhancedTripData {
  id: string;
  name: string;
  destinations: string[];
  start_date: string;
  end_date: string;
  description?: string;
  travel_style?: TravelStyle;
  vibe?: TripVibe;
  budget?: Budget;
  must_do?: string[];
  hotel_recommendations?: HotelRecommendation[];
  local_travel_info?: LocalTravelInfo;
  created_at: string;
  updated_at: string;
}

// Hotel recommendation interface
export interface HotelRecommendation {
  id?: string;
  name: string;
  location: string;
  description: string;
  link?: string;
  price_range?: string;
  rating?: number;
  amenities?: string[];
}

// Local travel information interface
export interface LocalTravelInfo {
  tips: string[];
  weather_advice: string;
  transportation?: TransportationInfo[];
  currency_info?: CurrencyInfo;
  cultural_notes?: string[];
}

// Transportation information
export interface TransportationInfo {
  type: 'public_transport' | 'taxi' | 'rental_car' | 'walking' | 'cycling';
  description: string;
  cost_estimate?: string;
  booking_link?: string;
}

// Currency information
export interface CurrencyInfo {
  currency_code: string;
  exchange_rate?: number;
  payment_methods: string[];
  tipping_culture?: string;
}

// Enhanced itinerary item interface
export interface EnhancedItineraryItem {
  id: string;
  trip_id: string;
  day_number: number;
  time_slot: string;
  activity_name: string;
  description: string;
  location?: string;
  duration_minutes?: number;
  cost_estimate?: string;
  trivia?: string;
  food_suggestion?: string;
  external_link?: string;
  is_ai_generated: boolean;
  activity_type: ActivityType;
  booking_required?: boolean;
  weather_dependent?: boolean;
  created_at: string;
  updated_at: string;
}

// Activity type enum
export enum ActivityType {
  SIGHTSEEING = 'sightseeing',
  DINING = 'dining',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  OUTDOOR = 'outdoor',
  CULTURAL = 'cultural',
  RELAXATION = 'relaxation',
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
}

// Bulk itinerary creation interface
export interface BulkItineraryCreate {
  trip_id: string;
  items: Omit<EnhancedItineraryItem, 'id' | 'trip_id' | 'created_at' | 'updated_at'>[];
  clear_existing?: boolean;
}

// Data validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// Calendar event interface for UI
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: EnhancedItineraryItem;
  color?: string;
  textColor?: string;
  borderColor?: string;
}

// Calendar view configuration
export interface CalendarViewConfig {
  defaultView: 'day' | 'week' | 'agenda';
  showWeekends: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  slotDuration: number; // minutes
  eventHeight: number; // pixels
}

// Activity filter interface
export interface ActivityFilter {
  activityTypes?: ActivityType[];
  isAiGenerated?: boolean;
  hasBookingRequired?: boolean;
  weatherDependent?: boolean;
  dayNumbers?: number[];
  timeRange?: {
    start: string;
    end: string;
  };
}

// Trip statistics interface
export interface TripStatistics {
  totalDays: number;
  totalActivities: number;
  aiGeneratedActivities: number;
  manualActivities: number;
  activitiesByType: Record<ActivityType, number>;
  estimatedTotalCost?: number;
  averageActivitiesPerDay: number;
}

// Constants for form validation and UI
export const TRAVEL_STYLES = [
  { value: 'solo', label: 'Solo Travel', icon: '🧳' },
  { value: 'couple', label: 'Couple', icon: '💑' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'friends', label: 'Friends', icon: '👥' },
  { value: 'business', label: 'Business', icon: '💼' },
];

export const TRIP_VIBES = [
  { value: 'relaxed', label: 'Relaxed', emoji: '😌' },
  { value: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { value: 'cultural', label: 'Cultural', emoji: '🏛️' },
  { value: 'romantic', label: 'Romantic', emoji: '💕' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'luxury', label: 'Luxury', emoji: '✨' },
  { value: 'budget', label: 'Budget', emoji: '💰' },
];

export const BUDGET_LEVELS = [
  { value: 'low', label: 'Budget', range: '$0-50/day', average: 25 },
  { value: 'mid', label: 'Mid-range', range: '$50-150/day', average: 100 },
  { value: 'high', label: 'Luxury', range: '$150+/day', average: 300 },
];

export const DIETARY_RESTRICTIONS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'nut_allergy', label: 'Nut Allergy' },
  { value: 'seafood_allergy', label: 'Seafood Allergy' },
];

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  [ActivityType.SIGHTSEEING]: '#3B82F6', // Blue
  [ActivityType.DINING]: '#EF4444', // Red
  [ActivityType.ENTERTAINMENT]: '#8B5CF6', // Purple
  [ActivityType.SHOPPING]: '#F59E0B', // Amber
  [ActivityType.OUTDOOR]: '#10B981', // Emerald
  [ActivityType.CULTURAL]: '#6366F1', // Indigo
  [ActivityType.RELAXATION]: '#06B6D4', // Cyan
  [ActivityType.TRANSPORTATION]: '#6B7280', // Gray
  [ActivityType.ACCOMMODATION]: '#84CC16', // Lime
};
