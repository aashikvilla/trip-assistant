import { 
  EnhancedN8NResponse, 
  HotelRecommendation, 
  LocalTravelInfo, 
  DayItinerary,
  ActivityDetail 
} from '@/types/itinerary';
import { supabase } from '@/integrations/supabase/client';
import { TablesInsert } from '@/integrations/supabase/types';

type ItineraryItemInsert = TablesInsert<'itinerary_items'>;

/**
 * Validates and parses hotel recommendations
 */
const parseHotelRecommendations = (data: unknown): HotelRecommendation[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map((hotel: unknown) => {
    const hotelData = hotel as Record<string, unknown>;
    return {
      name: String(hotelData.name || 'Unknown Hotel'),
      location: String(hotelData.location || ''),
      description: String(hotelData.description || ''),
      link: String(hotelData.link || '')
    };
  }).filter(hotel => hotel.name !== 'Unknown Hotel');
};

/**
 * Validates and parses local travel information
 */
const parseLocalTravelInfo = (data: unknown): LocalTravelInfo => {
  const travelData = data as Record<string, unknown>;
  return {
    tips: Array.isArray(travelData?.tips) ? travelData.tips.map(String) : [],
    weather_advice: String(travelData?.weather_advice || '')
  };
};

/**
 * Validates and parses activity details
 */
const parseActivityDetails = (activities: unknown[]): ActivityDetail[] => {
  if (!Array.isArray(activities)) return [];
  
  return activities.map((activity: unknown) => {
    const activityData = activity as Record<string, unknown>;
    return {
      time_slot: String(activityData.time_slot || ''),
      activity_name: String(activityData.activity_name || activityData.name || 'Untitled Activity'),
      description: String(activityData.description || ''),
      trivia: activityData.trivia ? String(activityData.trivia) : null,
      food_suggestion: activityData.food_suggestion ? String(activityData.food_suggestion) : null,
      link: activityData.link ? String(activityData.link) : null
    };
  });
};

/**
 * Validates and parses day itineraries
 */
const parseDayItineraries = (data: unknown): DayItinerary[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map((day: unknown) => {
    const dayData = day as Record<string, unknown>;
    const dayNumber = Number(dayData.day_number) || 1;
    return {
      day_number: dayNumber,
      title: String(dayData.title || `Day ${dayNumber}`),
      activities: parseActivityDetails((dayData.activities as unknown[]) || [])
    };
  });
};

/**
 * Parses the enhanced N8N response and validates structure
 */
export const parseItineraryResponse = (response: unknown): EnhancedN8NResponse => {
  console.log('🔄 Parsing N8N response...');
  
  // Handle different response formats
  const responseData = response as Record<string, unknown>;
  let output = responseData;
  if (responseData.output) {
    output = responseData.output as Record<string, unknown>;
  }
  
  const parsedResponse: EnhancedN8NResponse = {
    output: {
      hotel_recommendations: parseHotelRecommendations(output.hotel_recommendations),
      local_travel: parseLocalTravelInfo(output.local_travel),
      itinerary: parseDayItineraries(output.itinerary),
      closing_note: String(output.closing_note || '')
    }
  };
  
  console.log('✅ N8N response parsed successfully:', {
    hotels: parsedResponse.output.hotel_recommendations.length,
    days: parsedResponse.output.itinerary.length,
    totalActivities: parsedResponse.output.itinerary.reduce((sum, day) => sum + day.activities.length, 0)
  });
  
  return parsedResponse;
};

/**
 * Converts parsed N8N response to database itinerary items
 */
export const convertToItineraryItems = (
  parsedResponse: EnhancedN8NResponse,
  tripId: string,
  createdBy: string
): ItineraryItemInsert[] => {
  console.log('🔄 Converting to itinerary items...');
  
  const items: ItineraryItemInsert[] = [];
  
  parsedResponse.output.itinerary.forEach((day) => {
    day.activities.forEach((activity, index) => {
      const item: ItineraryItemInsert = {
        trip_id: tripId,
        created_by: createdBy,
        title: activity.activity_name,
        activity_description: activity.description,
        time_slot: activity.time_slot,
        trivia: activity.trivia,
        food_suggestion: activity.food_suggestion,
        external_link: activity.link,
        day_number: day.day_number,
        is_ai_generated: true,
        order_index: index,
        type: 'activity', // Default type
        all_day: false,
        notes: activity.trivia ? `Trivia: ${activity.trivia}` : null
      };
      
      items.push(item);
    });
  });
  
  console.log('✅ Converted to itinerary items:', { count: items.length });
  return items;
};

/**
 * Stores the enhanced data (hotels, travel info) in the trips table
 */
export const storeEnhancedTripData = async (
  tripId: string,
  parsedResponse: EnhancedN8NResponse
): Promise<void> => {
  console.log('🔄 Storing enhanced trip data...');
  
  const { error } = await supabase
    .from('trips')
    .update({
      hotel_recommendations: JSON.parse(JSON.stringify(parsedResponse.output.hotel_recommendations)),
      local_travel_info: JSON.parse(JSON.stringify(parsedResponse.output.local_travel)),
      itinerary_generated_at: new Date().toISOString(),
      itinerary_status: 'completed'
    })
    .eq('id', tripId);
  
  if (error) {
    console.error('❌ Error storing enhanced trip data:', error);
    throw error;
  }
  
  console.log('✅ Enhanced trip data stored successfully');
};

/**
 * Stores itinerary items in bulk
 */
export const storeItineraryItems = async (
  items: ItineraryItemInsert[]
): Promise<void> => {
  if (items.length === 0) return;
  
  console.log('🔄 Storing itinerary items in bulk...');
  
  const { error } = await supabase
    .from('itinerary_items')
    .insert(items);
  
  if (error) {
    console.error('❌ Error storing itinerary items:', error);
    throw error;
  }
  
  console.log('✅ Itinerary items stored successfully:', { count: items.length });
};

/**
 * Complete processing pipeline for N8N response
 */
export const processN8NResponse = async (
  response: unknown,
  tripId: string,
  createdBy: string
): Promise<void> => {
  console.log('🚀 Processing N8N response pipeline...');
  
  try {
    // Parse the response
    const parsedResponse = parseItineraryResponse(response);
    
    // Store enhanced trip data
    await storeEnhancedTripData(tripId, parsedResponse);
    
    // Convert and store itinerary items
    const items = convertToItineraryItems(parsedResponse, tripId, createdBy);
    await storeItineraryItems(items);
    
    console.log('🎉 N8N response processing completed successfully');
    
  } catch (error) {
    console.error('💥 Error processing N8N response:', error);
    throw error;
  }
};
