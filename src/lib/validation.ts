import { z } from 'zod';
import { 
  TripPreferences, 
  EnhancedItineraryItem, 
  HotelRecommendation, 
  LocalTravelInfo,
  ActivityType,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '@/types/trip';
import { TravelStyle, TripVibe, Budget } from '@/types/enums';

// Zod schemas for validation
export const TripPreferencesSchema = z.object({
  travel_style: z.array(z.string()).min(1, 'At least one travel style is required'),
  vibe: z.array(z.string()).min(1, 'At least one vibe is required'),
  budget_level: z.string().min(1, 'Budget level is required'),
  budget_amount: z.number().positive().optional(),
  must_do: z.array(z.string()).default([]),
  dietary_restrictions: z.array(z.string()).default([]),
  additional_notes: z.string().default(''),
});

export const HotelRecommendationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Hotel name is required'),
  location: z.string().min(1, 'Hotel location is required'),
  description: z.string().min(1, 'Hotel description is required'),
  link: z.string().url().optional(),
  price_range: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  amenities: z.array(z.string()).default([]),
});

export const LocalTravelInfoSchema = z.object({
  tips: z.array(z.string()).min(1, 'At least one tip is required'),
  weather_advice: z.string().min(1, 'Weather advice is required'),
  transportation: z.array(z.object({
    type: z.enum(['public_transport', 'taxi', 'rental_car', 'walking', 'cycling']),
    description: z.string().min(1),
    cost_estimate: z.string().optional(),
    booking_link: z.string().url().optional(),
  })).optional(),
  currency_info: z.object({
    currency_code: z.string().length(3),
    exchange_rate: z.number().positive().optional(),
    payment_methods: z.array(z.string()).min(1),
    tipping_culture: z.string().optional(),
  }).optional(),
  cultural_notes: z.array(z.string()).optional(),
});

export const EnhancedItineraryItemSchema = z.object({
  id: z.string().optional(),
  trip_id: z.string().uuid('Invalid trip ID'),
  day_number: z.number().int().positive('Day number must be positive'),
  time_slot: z.string().min(1, 'Time slot is required'),
  activity_name: z.string().min(1, 'Activity name is required'),
  description: z.string().min(1, 'Activity description is required'),
  location: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  cost_estimate: z.string().optional(),
  trivia: z.string().optional(),
  food_suggestion: z.string().optional(),
  external_link: z.string().url().optional(),
  is_ai_generated: z.boolean().default(false),
  activity_type: z.nativeEnum(ActivityType).default(ActivityType.SIGHTSEEING),
  booking_required: z.boolean().default(false),
  weather_dependent: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const BulkItineraryCreateSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  items: z.array(EnhancedItineraryItemSchema.omit({ 
    id: true, 
    trip_id: true, 
    created_at: true, 
    updated_at: true 
  })).min(1, 'At least one item is required'),
  clear_existing: z.boolean().default(false),
});

// Validation utility class
export class DataValidator {
  /**
   * Validate trip preferences
   */
  static validateTripPreferences(data: unknown): ValidationResult {
    const result = TripPreferencesSchema.safeParse(data);
    
    if (result.success) {
      const warnings = this.generateTripPreferencesWarnings(result.data);
      return {
        isValid: true,
        errors: [],
        warnings
      };
    }

    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      warnings: []
    };
  }

  /**
   * Validate hotel recommendations
   */
  static validateHotelRecommendations(data: unknown): ValidationResult {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [{
          field: 'root',
          message: 'Hotel recommendations must be an array',
          code: 'invalid_type'
        }],
        warnings: []
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    data.forEach((item, index) => {
      const result = HotelRecommendationSchema.safeParse(item);
      if (!result.success) {
        result.error.errors.forEach(err => {
          errors.push({
            field: `[${index}].${err.path.join('.')}`,
            message: err.message,
            code: err.code
          });
        });
      } else {
        // Generate warnings for missing optional but recommended fields
        if (!result.data.link) {
          warnings.push({
            field: `[${index}].link`,
            message: 'Hotel link is recommended for better user experience',
            suggestion: 'Add a booking or information link'
          });
        }
        if (!result.data.rating) {
          warnings.push({
            field: `[${index}].rating`,
            message: 'Hotel rating helps users make decisions',
            suggestion: 'Add a rating from 0-5'
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate local travel information
   */
  static validateLocalTravelInfo(data: unknown): ValidationResult {
    const result = LocalTravelInfoSchema.safeParse(data);
    
    if (result.success) {
      const warnings = this.generateLocalTravelWarnings(result.data);
      return {
        isValid: true,
        errors: [],
        warnings
      };
    }

    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      warnings: []
    };
  }

  /**
   * Validate enhanced itinerary item
   */
  static validateItineraryItem(data: unknown): ValidationResult {
    const result = EnhancedItineraryItemSchema.safeParse(data);
    
    if (result.success) {
      const warnings = this.generateItineraryItemWarnings(result.data);
      return {
        isValid: true,
        errors: [],
        warnings
      };
    }

    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      warnings: []
    };
  }

  /**
   * Validate bulk itinerary creation
   */
  static validateBulkItineraryCreate(data: unknown): ValidationResult {
    const result = BulkItineraryCreateSchema.safeParse(data);
    
    if (result.success) {
      const warnings = this.generateBulkItineraryWarnings(result.data);
      return {
        isValid: true,
        errors: [],
        warnings
      };
    }

    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      warnings: []
    };
  }

  /**
   * Validate time slot format
   */
  static validateTimeSlot(timeSlot: string): boolean {
    const timeSlotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeSlotRegex.test(timeSlot);
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate enum values
   */
  static validateTravelStyle(value: string): boolean {
    return Object.values(TravelStyle).includes(value as TravelStyle);
  }

  static validateTripVibe(value: string): boolean {
    return Object.values(TripVibe).includes(value as TripVibe);
  }

  static validateBudget(value: string): boolean {
    return Object.values(Budget).includes(value as Budget);
  }

  static validateActivityType(value: string): boolean {
    return Object.values(ActivityType).includes(value as ActivityType);
  }

  /**
   * Generate warnings for trip preferences
   */
  private static generateTripPreferencesWarnings(data: TripPreferences): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.travel_style.length > 3) {
      warnings.push({
        field: 'travel_style',
        message: 'Too many travel styles selected',
        suggestion: 'Consider selecting 1-3 main travel styles for better recommendations'
      });
    }

    if (data.vibe.length > 4) {
      warnings.push({
        field: 'vibe',
        message: 'Too many vibes selected',
        suggestion: 'Consider selecting 1-4 main vibes for focused recommendations'
      });
    }

    if (data.budget_level === 'high' && (!data.budget_amount || data.budget_amount < 200)) {
      warnings.push({
        field: 'budget_amount',
        message: 'Budget amount seems low for luxury level',
        suggestion: 'Consider increasing budget amount or selecting mid-range level'
      });
    }

    return warnings;
  }

  /**
   * Generate warnings for local travel info
   */
  private static generateLocalTravelWarnings(data: LocalTravelInfo): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.tips.length < 3) {
      warnings.push({
        field: 'tips',
        message: 'Consider adding more travel tips',
        suggestion: 'Add 3-5 practical tips for better user experience'
      });
    }

    if (!data.transportation || data.transportation.length === 0) {
      warnings.push({
        field: 'transportation',
        message: 'Transportation information is missing',
        suggestion: 'Add transportation options for better trip planning'
      });
    }

    if (!data.currency_info) {
      warnings.push({
        field: 'currency_info',
        message: 'Currency information is missing',
        suggestion: 'Add currency and payment information for travelers'
      });
    }

    return warnings;
  }

  /**
   * Generate warnings for itinerary items
   */
  private static generateItineraryItemWarnings(data: Partial<EnhancedItineraryItem>): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (!data.location) {
      warnings.push({
        field: 'location',
        message: 'Location information is missing',
        suggestion: 'Add location for better navigation and planning'
      });
    }

    if (!data.duration_minutes) {
      warnings.push({
        field: 'duration_minutes',
        message: 'Duration is not specified',
        suggestion: 'Add estimated duration for better time planning'
      });
    }

    if (data.activity_type === ActivityType.OUTDOOR && !data.weather_dependent) {
      warnings.push({
        field: 'weather_dependent',
        message: 'Outdoor activity should be marked as weather dependent',
        suggestion: 'Consider marking this activity as weather dependent'
      });
    }

    if (data.external_link && !this.validateUrl(data.external_link)) {
      warnings.push({
        field: 'external_link',
        message: 'External link format is invalid',
        suggestion: 'Ensure the link starts with http:// or https://'
      });
    }

    return warnings;
  }

  /**
   * Generate warnings for bulk itinerary creation
   */
  private static generateBulkItineraryWarnings(data: any): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (data.items.length > 50) {
      warnings.push({
        field: 'items',
        message: 'Large number of activities detected',
        suggestion: 'Consider breaking down into smaller batches for better performance'
      });
    }

    // Check for day number gaps
    const dayNumbers = data.items.map((item: any) => item.day_number).sort((a: number, b: number) => a - b);
    const uniqueDays = [...new Set(dayNumbers)];
    
    for (let i = 1; i < uniqueDays.length; i++) {
      if (uniqueDays[i] - uniqueDays[i - 1] > 1) {
        warnings.push({
          field: 'items',
          message: `Gap detected between day ${uniqueDays[i - 1]} and day ${uniqueDays[i]}`,
          suggestion: 'Consider adding activities for missing days or adjusting day numbers'
        });
      }
    }

    return warnings;
  }
}

// Export validation functions for convenience
export const validateTripPreferences = DataValidator.validateTripPreferences;
export const validateHotelRecommendations = DataValidator.validateHotelRecommendations;
export const validateLocalTravelInfo = DataValidator.validateLocalTravelInfo;
export const validateItineraryItem = DataValidator.validateItineraryItem;
export const validateBulkItineraryCreate = DataValidator.validateBulkItineraryCreate;
