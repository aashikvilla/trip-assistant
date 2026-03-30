import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { mapTripToN8NRequest } from "./n8nMappingService";
import { processN8NResponse } from "./n8nResponseParser";
import { EnhancedN8NRequest, EnhancedN8NResponse } from "@/types/itinerary";
import { Tables } from "@/integrations/supabase/types";

// Legacy interfaces for backward compatibility
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
 * Call enhanced N8N webhook to generate itinerary
 */
export const generateEnhancedItinerary = async (request: EnhancedN8NRequest): Promise<EnhancedN8NResponse> => {
  console.log('🚀 Calling enhanced N8N webhook with request:', request);
  
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://aashik99.app.n8n.cloud/webhook-test/vibetrip';
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    console.log('📡 Enhanced N8N Response status:', response.status);
    console.log('📡 Enhanced N8N Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Enhanced N8N Error response:', errorText);
      throw new Error(`Enhanced N8N webhook failed with status ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('✅ Enhanced N8N Response data:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('💥 Enhanced N8N Request failed:', error);
    throw error;
  }
};

/**
 * Legacy N8N webhook call (for backward compatibility)
 */
export const generateItinerary = async (request: N8NItineraryRequest): Promise<N8NItineraryResponse[]> => {
  console.log('🚀 Calling legacy N8N webhook with request:', request);
  
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://aashik99.app.n8n.cloud/webhook-test/vibetrip';
  console.log('🔗 Using webhook URL:', webhookUrl);
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    console.log('📡 N8N Response status:', response.status);
    console.log('📡 N8N Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ N8N Error response:', errorText);
      throw new Error(`N8N webhook failed with status ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('✅ N8N Response data:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('💥 N8N Request failed:', error);
    throw error;
  }
};

/**
 * Process structured itinerary data into ParsedItinerary format
 */
const processStructuredItineraryData = (data: Record<string, any>): ParsedItinerary => {
  console.log('🔄 Processing structured itinerary data:', data);
  
  const days: ParsedItineraryDay[] = [];

  // Handle different data structures
  if (data.days && Array.isArray(data.days)) {
    // If data has a days array, use it directly
    return {
      days: data.days,
      closing_note: data.closing_note || data.ClosingNote
    };
  }

  // Parse each day from the response object
  Object.keys(data).forEach(key => {
    console.log('🔑 Processing key:', key);
    
    if (key.startsWith('Day ')) {
      const dayNumber = parseInt(key.replace('Day ', ''));
      const dayData = data[key];
      
      console.log(`📅 Day ${dayNumber} data:`, dayData);
      
      days.push({
        day: dayNumber,
        title: dayData.Title || `Day ${dayNumber}`,
        morning: dayData.Morning,
        afternoon: dayData.Afternoon,
        evening: dayData.Evening,
        hotel_recommendations: dayData['Hotel Recommendations']
      });
    }
  });

  return {
    days: days.sort((a, b) => a.day - b.day),
    closing_note: data.ClosingNote
  };
};

/**
 * Parse the N8N JSON response into structured itinerary data
 */
export const parseItineraryResponse = (response: N8NItineraryResponse[]): ParsedItinerary => {
  console.log('🔍 Parsing itinerary response:', response);
  
  if (!response || response.length === 0) {
    throw new Error('Empty response from N8N');
  }

  try {
    // Extract output from response
    const output = response[0].output;
    console.log('📄 Raw output:', output);
    console.log('📄 Output type:', typeof output);
    
    let outputString: string;
    
    // Handle different response formats
    if (typeof output === 'string') {
      outputString = output;
    } else if (typeof output === 'object' && output !== null) {
      // If output is already an object, stringify it first
      outputString = JSON.stringify(output);
    } else {
      console.error('❌ Unexpected output format:', output);
      throw new Error(`Unexpected output format: ${typeof output}`);
    }
    
    console.log('📄 Processed output string:', outputString);
    
    // Try to parse as direct JSON first
    try {
      const directJson = JSON.parse(outputString);
      console.log('✅ Direct JSON parse successful:', directJson);
      
      // If it's already structured data, use it directly
      if (directJson && typeof directJson === 'object') {
        return processStructuredItineraryData(directJson);
      }
    } catch (directParseError) {
      console.log('📝 Direct JSON parse failed, trying regex extraction...');
    }
    
    // Try multiple regex patterns to extract JSON
    let jsonMatch = outputString.match(/json\n({[\s\S]*})\n/);
    
    if (!jsonMatch) {
      // Try alternative pattern without trailing newline
      jsonMatch = outputString.match(/json\n({[\s\S]*})/);
    }
    
    if (!jsonMatch) {
      // Try pattern with any whitespace
      jsonMatch = outputString.match(/json\s*({[\s\S]*})/);
    }
    
    if (!jsonMatch) {
      // Try to find any JSON object in the string
      jsonMatch = outputString.match(/({[\s\S]*})/);
    }
    
    if (!jsonMatch) {
      console.error('❌ Could not extract JSON. Raw output:', outputString);
      throw new Error('Could not extract JSON from N8N response');
    }

    console.log('🎯 Extracted JSON string:', jsonMatch[1]);
    
    const itineraryData = JSON.parse(jsonMatch[1]);
    console.log('📊 Parsed itinerary data:', itineraryData);
    
    return processStructuredItineraryData(itineraryData);
    
  } catch (error) {
    console.error('💥 Error parsing itinerary response:', error);
    console.error('📄 Original response:', response);
    throw new Error(`Failed to parse itinerary response: ${error.message}`);
  }
};

/**
 * Calculate duration in days between two dates
 */
export const calculateDuration = (startDate: string | null, endDate: string | null): number => {
  if (!startDate || !endDate) return 7; // Default to 7 days
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration = differenceInDays(end, start) + 1; // Include both start and end days
  
  return Math.max(1, duration); // Minimum 1 day
};

/**
 * Enhanced itinerary generation with full N8N integration
 */
export const generateEnhancedTripItinerary = async (tripId: string, userId: string): Promise<void> => {
  console.log('🎯 Starting enhanced itinerary generation for trip:', tripId);
  
  try {
    // Update status to generating
    await supabase
      .from('trips')
      .update({ itinerary_status: 'generating' })
      .eq('id', tripId);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('❌ Trip not found:', tripError);
      throw new Error('Trip not found');
    }

    console.log('📋 Enhanced trip details:', {
      id: trip.id,
      name: trip.name,
      destination: trip.destination_main,
      startDate: trip.start_date,
      endDate: trip.end_date,
      travelStyle: trip.travel_style,
      vibe: trip.vibe,
      budget: trip.budget
    });

    // Map trip to enhanced N8N request
    const enhancedRequest = await mapTripToN8NRequest(trip);

    console.log('📤 Prepared enhanced N8N request:', enhancedRequest);

    // Call enhanced N8N workflow
    const enhancedResponse = await generateEnhancedItinerary(enhancedRequest);
    
    // Process the enhanced response (parse and store)
    await processN8NResponse(enhancedResponse, tripId, userId);

    console.log('🎉 Enhanced itinerary generation completed successfully');

  } catch (error) {
    console.error('💥 Error generating enhanced itinerary:', error);
    
    // Update status to failed
    await supabase
      .from('trips')
      .update({ itinerary_status: 'failed' })
      .eq('id', tripId);
    
    throw error;
  }
};

/**
 * Legacy itinerary generation (for backward compatibility)
 */
export const generateTripItinerary = async (tripId: string): Promise<void> => {
  console.log('🎯 Starting legacy itinerary generation for trip:', tripId);
  
  try {
    // Update status to generating
    await supabase
      .from('trips')
      .update({ itinerary_status: 'generating' })
      .eq('id', tripId);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('❌ Trip not found:', tripError);
      throw new Error('Trip not found');
    }

    console.log('📋 Trip details:', {
      id: trip.id,
      name: trip.name,
      destination: trip.destination_main,
      startDate: trip.start_date,
      endDate: trip.end_date
    });

    // Prepare N8N request
    const duration = calculateDuration(trip.start_date, trip.end_date);
    const country = trip.destination_main || 'Paris'; // Default to Paris if no destination

    const n8nRequest: N8NItineraryRequest = {
      country: country.toLowerCase(),
      duration_in_days: duration
    };

    console.log('📤 Prepared N8N request:', n8nRequest);

    // Call N8N workflow
    const n8nResponse = await generateItinerary(n8nRequest);
    
    // Parse the response
    const parsedItinerary = parseItineraryResponse(n8nResponse);

    console.log('✅ Parsed itinerary:', parsedItinerary);

    // Save the raw AI response and update status
    await supabase
      .from('trips')
      .update({
        itinerary_status: 'completed',
        itinerary_generated_at: new Date().toISOString(),
        ai_itinerary_data: JSON.parse(JSON.stringify(parsedItinerary))
      })
      .eq('id', tripId);

    console.log('💾 Saved itinerary to database');

  } catch (error) {
    console.error('💥 Error generating itinerary:', error);
    
    // Update status to failed
    await supabase
      .from('trips')
      .update({ itinerary_status: 'failed' })
      .eq('id', tripId);
    
    throw error;
  }
};
