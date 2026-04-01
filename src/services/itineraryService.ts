import { differenceInDays } from "date-fns";

// Legacy interfaces kept for AIItineraryDisplay compatibility
export interface N8NItineraryRequest {
  country: string;
  duration_in_days: number;
}

export interface N8NItineraryResponse {
  output: string;
}

export interface ParsedItineraryDay {
  day: number;
  title: string;
  morning?: {
    activities?: string[];
    breakfast?: string;
  };
  afternoon?: {
    activities?: string[];
    lunch?: string;
  };
  evening?: {
    activities?: string[];
    dinner?: string;
    local_travel?: string;
  };
  hotel_recommendations?: string[];
}

export interface ParsedItinerary {
  days: ParsedItineraryDay[];
  closing_note?: string;
}

/**
 * Calculate duration in days between two dates
 */
export const calculateDuration = (startDate: string | null, endDate: string | null): number => {
  if (!startDate || !endDate) return 7;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = differenceInDays(end, start) + 1;

  return Math.max(1, duration);
};
