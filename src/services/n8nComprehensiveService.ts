import { supabase, supabaseService } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { differenceInDays } from 'date-fns';
import { 
  N8NComprehensiveRequest, 
  N8NComprehensiveResponse, 
  TripData, 
  TripMemberWithProfile,
  N8NTripDetails,
  N8NTraveler,
  N8NGlobalPreferences
} from "@/types/n8n";

type Json = 
  | string 
  | number 
  | boolean 
  | null 
  | { [key: string]: Json | undefined } 
  | Json[];

/**
 * Build comprehensive N8N request from trip data
 */
export const buildComprehensiveN8NRequest = async (tripId: string): Promise<N8NComprehensiveRequest> => {
  console.log('🔍 [buildComprehensiveN8NRequest] Starting with trip ID:', tripId);
  
  // Validate trip ID format
  if (!tripId || typeof tripId !== 'string' || tripId.trim() === '') {
    throw new Error(`Invalid trip ID format: ${tripId}`);
  }

  // Try with service client first (bypasses RLS)
  console.log('🔍 [buildComprehensiveN8NRequest] Fetching trip with service client...');
  const { data: serviceTrip, error: serviceError } = await supabaseService
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (serviceError || !serviceTrip) {
    console.error('❌ [buildComprehensiveN8NRequest] Service client fetch failed:', serviceError);
    
    // Fall back to regular client for better error reporting
    const { data: regularTrip, error: regularError } = await supabase
      .from('trips')
      .select('id, name, created_at')
      .eq('id', tripId)
      .single();

    if (regularError || !regularTrip) {
      console.error('❌ [buildComprehensiveN8NRequest] Regular client also failed:', regularError);
      throw new Error(`Trip not found in database for ID: ${tripId}. Please check if the trip exists and you have proper permissions.`);
    }
    
    console.log('ℹ️ [buildComprehensiveN8NRequest] Found trip with regular client but not service client. Check RLS policies.');
    throw new Error('Trip found but service account cannot access it. Please check RLS policies.');
  }
  
  console.log('✅ [buildComprehensiveN8NRequest] Successfully fetched trip with service client');
  
  console.log('✅ Found trip with ID:', serviceTrip.id);
  
  // Define proper types for the trip query
  type TripWithMembers = {
    id: string;
    name: string;
    destination_main: string;
    start_date: string;
    end_date: string;
    description?: string;
    travel_style?: string;
    vibe?: string;
    budget?: string;
    activity_level?: string;
    must_do_activities?: string[];
    dietary_preferences?: string[];
    trip_members: Array<{
      profile_id: string;
      profiles: {
        id: string;
        preferences?: Json;
      };
    }>;
  };

  // Fetch full trip data with members
  const { data: trip, error: tripError } = await supabaseService
    .from('trips')
    .select(`
      *,
      trip_members!inner(
        profile_id,
        profiles(
          id,
          preferences
        )
      )
    `)
    .eq('id', tripId)
    .single<TripWithMembers>();

  if (tripError || !trip) {
    throw new Error(`Failed to fetch trip data: ${tripError?.message || 'Trip not found'}`);
  }

  console.log('📋 Trip data retrieved with members:', trip.trip_members?.length || 0, 'members');

  // Calculate trip length
  const startDate = trip.start_date ? new Date(trip.start_date) : new Date();
  const endDate = trip.end_date ? new Date(trip.end_date) : new Date(startDate);
  endDate.setDate(startDate.getDate() + 1); // Default to 1 day if no end date
  
  const tripLengthDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

  // Map budget to N8N compatible format
  const budgetMapping: Record<string, 'low' | 'mid' | 'high'> = {
    'budget': 'low',
    'mid_range': 'mid',
    'luxury': 'high',
    'ultra_luxury': 'high',
    'mid': 'mid',
    'low': 'low',
    'high': 'high'
  };

  // Safely map budget to N8N format
  const tripBudget = (() => {
    const budget = (trip.budget || '').toLowerCase() as keyof typeof budgetMapping;
    return budgetMapping[budget] || 'mid'; // Default to mid if not found
  })();

  // Normalize activity level once for reuse (store may be low/moderate/high)
  const mappedActivity: 'light' | 'moderate' | 'active' = (() => {
    const lvl = (trip.activity_level || '').toLowerCase();
    if (lvl === 'low' || lvl === 'light') return 'light';
    if (lvl === 'high' || lvl === 'active') return 'active';
    return 'moderate';
  })();

  // Build trip details - handle new fields that may not exist in old schema
  const tripDetails: N8NTripDetails = {
    destinations: trip.destination_main ? [trip.destination_main] : [],
    trip_name: trip.name || 'My Trip',
    trip_length_days: tripLengthDays,
    travel_dates: {
      start_date: trip.start_date || new Date().toISOString().split('T')[0],
      end_date: trip.end_date || new Date().toISOString().split('T')[0]
    },
    travel_style: trip.travel_style || 'Group',
    vibe: trip.vibe || 'Relaxed and fun',
    budget: trip.budget ? budgetMapping[trip.budget as keyof typeof budgetMapping] || 'mid' : 'mid',
    // Duplicate field for workflows expecting `activity_level`
    activity_level: mappedActivity,
    must_do: Array.isArray(trip.must_do_activities) 
      ? trip.must_do_activities 
      : [],
    description: trip.description || `A ${tripLengthDays}-day trip to ${trip.destination_main || 'explore new places'}.`
  };

  // Process trip members with proper type checking and error handling
  const travelers: N8NTraveler[] = [];
  const dietaryPreferences = new Set<string>();
  
  // Helper function to safely process string arrays with proper type narrowing
  const safeStringArray = (value: unknown): string[] => {
    if (!value) return [];
    // Already an array
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
    // JSON string that may contain an array
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        // Not JSON, attempt comma-separated values
        return trimmed
          .split(',')
          .map(s => s.trim())
          .filter((s): s is string => !!s);
      }
    }
    return [];
  };
  
  // Define profile type for type safety
  interface MemberProfile {
    preferences?: Json; // JSON blob that may contain interests/dietary
    [key: string]: unknown;
  }

  interface PreferencesJSON {
    interests?: unknown;
    dietary?: unknown;
  }

  // Helper to safely access member properties
  const getMemberProfile = (member: unknown): MemberProfile | undefined => {
    if (member && typeof member === 'object' && 'profiles' in member) {
      const memberWithProfile = member as { profiles?: MemberProfile };
      return memberWithProfile.profiles;
    }
    return undefined;
  };
  
  if (trip.trip_members && Array.isArray(trip.trip_members)) {
    trip.trip_members.forEach((member, index) => {
      try {
        const profile = getMemberProfile(member);
        if (!profile) return;
        console.log(`[N8N Payload] Member ${index + 1} raw preferences JSON:`, profile.preferences ?? null);

        let interests: string[] = [];
        let memberDietary: string[] = [];

        if (profile.preferences) {
          try {
            const prefsObj: PreferencesJSON = typeof profile.preferences === 'string'
              ? (JSON.parse(profile.preferences) as PreferencesJSON)
              : (profile.preferences as PreferencesJSON);

            if (prefsObj && prefsObj.interests) {
              interests = safeStringArray(prefsObj.interests);
            }
            if (prefsObj && prefsObj.dietary) {
              memberDietary = safeStringArray(prefsObj.dietary);
            }
          } catch (e) {
            console.warn(`[N8N Payload] Member ${index + 1} failed to parse preferences JSON`, e);
          }
        }
        console.log(`[N8N Payload] Member ${index + 1} parsed counts:`, {
          interestsCount: interests.length,
          dietaryCount: memberDietary.length,
        });
        
        // Create traveler with proper typing
        const traveler: N8NTraveler = {
          id: `traveler_${index + 1}`,
          interests: interests,
          dietary_restrictions: memberDietary
        };
        travelers.push(traveler);
        
        // Add to dietary preferences set for deduplication
        memberDietary.forEach(pref => {
          const cleanPref = pref.trim().toLowerCase();
          if (cleanPref) dietaryPreferences.add(cleanPref);
        });
      } catch (error) {
        console.error('Error processing trip member:', error);
      }
    });
  }

  // Add trip-level dietary preferences if any
  const tripDietaryPrefs = safeStringArray(trip.dietary_preferences as unknown);
  console.log('[N8N Payload] Trip-level dietary raw:', trip.dietary_preferences, 'parsed:', tripDietaryPrefs);
  
  tripDietaryPrefs.forEach(pref => {
    const cleanPref = pref.trim().toLowerCase();
    if (cleanPref) dietaryPreferences.add(cleanPref);
  });

  // Debug logs for payload completeness
  console.log('[N8N Payload] Travelers count:', travelers.length);
  console.log('[N8N Payload] Global dietary count:', dietaryPreferences.size);

  const globalPreferences: N8NGlobalPreferences = {
    dietary: Array.from(dietaryPreferences)
  };

  const request: N8NComprehensiveRequest = {
    trip_details: tripDetails,
    travelers: travelers,
    global_preferences: globalPreferences
  };

  console.log('✅ Comprehensive N8N request built:', request);
  return request;
};

/**
 * Call N8N webhook with comprehensive request
 */
export const callComprehensiveN8NWebhook = async (request: N8NComprehensiveRequest): Promise<N8NComprehensiveResponse[]> => {
  console.log('🚀 Calling comprehensive N8N webhook with request:', request);
  
  const webhookUrl = "/api/ai/generate-itinerary";
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
    console.log('✅ Comprehensive N8N Response data:', responseData);
    
    return responseData;
  } catch (error) {
    console.error('💥 Comprehensive N8N Request failed:', error);
    throw error;
  }
};

/**
 * Process comprehensive N8N response and update database
 */
const processComprehensiveN8NResponse = async (
  tripId: string, 
  response: N8NComprehensiveResponse
): Promise<void> => {
  try {
    console.log('📝 Processing comprehensive N8N response for trip:', tripId);
    
    const { output } = response;
    
    if (!output || !output.itinerary) {
      throw new Error('Invalid N8N response: missing itinerary data');
    }

    // Fetch trip owner to satisfy NOT NULL on itinerary_items.created_by
    const { data: ownerRow, error: ownerError } = await supabaseService
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single();

    if (ownerError || !ownerRow?.created_by) {
      console.error('❌ Could not fetch trip owner for created_by:', ownerError);
      throw new Error('Trip owner (created_by) not found; cannot insert itinerary items');
    }
    const createdBy = ownerRow.created_by as string;

    // Parse itinerary items for database insertion
    const itineraryItems: TablesInsert<'itinerary_items'>[] = [];
    
    if (output.itinerary && Array.isArray(output.itinerary)) {
      for (const [dayIndex, day] of output.itinerary.entries()) {
        if (day.activities && Array.isArray(day.activities)) {
          for (const [activityIndex, activity] of day.activities.entries()) {
            itineraryItems.push({
              trip_id: tripId,
              created_by: createdBy,
              type: 'activity',
              title: activity.activity_name || `Activity ${activityIndex + 1}`,
              notes: activity.description || null,
              location_name: null, // Not in output format
              time_slot: activity.time_slot || null,
              activity_description: activity.description || null,
              food_suggestion: activity.food_suggestion || null,
              external_link: activity.link || null,
              day_number: dayIndex + 1,
              order_index: activityIndex,
              is_ai_generated: true,
              all_day: false
            });
          }
        }
      }
    }

    console.log(`📋 Parsed ${itineraryItems.length} itinerary items`);

    // Update trip with comprehensive data - safely cast output to Json type
    const { error: updateError } = await supabaseService
      .from('trips')
      .update({
        ai_itinerary_data: output as unknown as Json,
        hotel_recommendations: JSON.stringify(output.hotel_recommendations || []) as unknown as Json,
        itinerary_status: 'completed',
        itinerary_generated_at: new Date().toISOString()
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('❌ Error updating trip:', updateError);
      throw updateError;
    }

    console.log('✅ Trip updated with AI itinerary data');

    // Insert itinerary items
    if (itineraryItems.length > 0) {
      const { error: itemsError } = await supabaseService
        .from('itinerary_items')
        .insert(itineraryItems as TablesInsert<'itinerary_items'>[]);

      if (itemsError) {
        console.error('❌ Error inserting itinerary items:', itemsError);
        throw itemsError;
      }

      console.log(`✅ Inserted ${itineraryItems.length} itinerary items`);
    }

    console.log('🎉 Comprehensive itinerary generation completed successfully!');
  } catch (error) {
    console.error('💥 Error processing comprehensive N8N response:', error);
    
    // Update status to failed
    await supabaseService
      .from('trips')
      .update({ itinerary_status: 'failed' })
      .eq('id', tripId);
    
    throw error;
  }
};

/**
 * Background processing function for itinerary generation
 */
const processItineraryInBackground = async (tripId: string, jobId: string): Promise<void> => {
  try {
    const t0 = Date.now();
    console.log('🚀 BACKGROUND STEP 1: Starting background itinerary processing for trip:', tripId, 'Job ID:', jobId);
    
    // Update job status to 'processing'
    console.log('🔍 BACKGROUND STEP 2: Updating job status to processing...');
    await supabaseService
      .from('itinerary_generation_jobs')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    console.log('✅ BACKGROUND STEP 2 PASSED: Job status updated to processing');
    
    // Build the comprehensive request
    console.log('🔍 BACKGROUND STEP 3: Building N8N request...');
    const tBuildStart = Date.now();
    const request = await buildComprehensiveN8NRequest(tripId);
    console.log('✅ BACKGROUND STEP 3 PASSED: N8N request built in', Date.now() - tBuildStart, 'ms');
    
    // Send to N8N webhook
    console.log('🔍 BACKGROUND STEP 4: Sending request to N8N webhook...');
    const n8nWebhookUrl = "/api/ai/generate-itinerary";

    // Convert request to plain object to avoid type issues
    const requestData = {
      trip_details: request.trip_details,
      travelers: request.travelers,
      global_preferences: request.global_preferences
    };
    
    const controller = new AbortController();
    const timeoutMs = 120_000; // 120s
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const tWebhookStart = Date.now();
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    console.log('📡 BACKGROUND STEP 4 RESPONSE: Status:', response.status, 'OK:', response.ok, 'after', Date.now() - tWebhookStart, 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ BACKGROUND STEP 4 FAILED: N8N webhook error:', errorText);
      throw new Error(`N8N webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Some N8N webhooks may return 204 or empty body; parse defensively
    const rawText = await response.text();
    console.log('📦 BACKGROUND STEP 4 RAW RESPONSE LENGTH:', rawText?.length ?? 0);

    if (!rawText || rawText.trim() === '') {
      throw new Error('N8N returned empty response body');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ BACKGROUND STEP 4 FAILED: Invalid JSON from N8N:', rawText.slice(0, 500));
      throw new Error('Invalid JSON from N8N');
    }

    // Support either an array response or single object
    const n8nResponse = (Array.isArray(parsedJson) ? parsedJson[0] : parsedJson) as unknown as N8NComprehensiveResponse | Record<string, unknown>;

    const hasOutput = typeof n8nResponse === 'object' && n8nResponse !== null && 'output' in (n8nResponse as Record<string, unknown>);
    if (!hasOutput) {
      console.error('❌ BACKGROUND STEP 4 FAILED: Missing output in N8N response:', parsedJson);
      throw new Error('N8N response missing required output field');
    }
    console.log('✅ BACKGROUND STEP 4 PASSED: Received N8N response');

    // After validation, safely narrow to expected type
    const safeResponse = n8nResponse as N8NComprehensiveResponse;

    // Update job with response data
    console.log('🔍 BACKGROUND STEP 5: Updating job with response data...');
    await supabaseService
      .from('itinerary_generation_jobs')
      .update({ 
        status: 'completed',
        response_data: safeResponse as unknown as Json,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    console.log('✅ BACKGROUND STEP 5 PASSED: Job updated with response data');

    // Process the response and update database
    console.log('🔍 BACKGROUND STEP 6: Processing N8N response and updating database...');
    await processComprehensiveN8NResponse(tripId, safeResponse);
    console.log('✅ BACKGROUND STEP 6 PASSED: Database updated with itinerary data');
    
    console.log('🎉 BACKGROUND PROCESSING COMPLETED SUCCESSFULLY in', Date.now() - t0, 'ms');
    
  } catch (error) {
    console.error('💥 BACKGROUND PROCESSING FAILED:', error);
    
    // Update job status to failed
    await supabaseService
      .from('itinerary_generation_jobs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    // Update trip status to failed
    await supabaseService
      .from('trips')
      .update({ 
        itinerary_status: 'failed',
        itinerary_generated_at: new Date().toISOString()
      })
      .eq('id', tripId);
    
    throw error;
  }
};

/**
 * Generate comprehensive itinerary using N8N workflow (async background job)
 */
export const generateComprehensiveItinerary = async (tripId: string): Promise<void> => {
  console.log('🎯 STEP 1: Starting comprehensive itinerary generation for trip:', tripId);
  console.log('🔍 Trip ID type:', typeof tripId, 'Value:', tripId, 'Length:', tripId.length);
  
  // Validate trip ID format
  if (!tripId || typeof tripId !== 'string' || tripId.trim() === '') {
    console.error('❌ STEP 1 FAILED: Invalid trip ID format');
    throw new Error(`Invalid trip ID: ${tripId}`);
  }

  console.log('✅ STEP 2: Trip ID validation passed');

  // Verify trip exists before setting status
  console.log('🔍 STEP 3: Verifying trip exists...');
  const { data: existingTrip, error: checkError } = await supabaseService
    .from('trips')
    .select('id, name, created_by')
    .eq('id', tripId)
    .single();

  if (checkError || !existingTrip) {
    console.error('❌ STEP 3 FAILED: Trip verification failed:', checkError);
    console.error('❌ Trip ID that failed:', tripId);
    throw new Error(`Trip not found during verification: ${tripId}`);
  }

  console.log('✅ STEP 3 PASSED: Trip verified:', existingTrip);

  // Build N8N request to get payload for job record
  console.log('🔍 STEP 4: Building N8N request payload...');
  let requestPayload;
  try {
    requestPayload = await buildComprehensiveN8NRequest(tripId);
    console.log('✅ STEP 4 PASSED: N8N request payload built');
  } catch (error) {
    console.error('❌ STEP 4 FAILED: Error building N8N request:', error);
    // Ensure UI can reflect failure even if job wasn't created
    try {
      await supabaseService
        .from('trips')
        .update({ 
          itinerary_status: 'failed',
          itinerary_generated_at: new Date().toISOString()
        })
        .eq('id', tripId);
    } catch (statusErr) {
      console.warn('Failed to update trip status after STEP 4 error:', statusErr);
    }
    throw error;
  }

  // Create job record in itinerary_generation_jobs table
  console.log('🔍 STEP 5: Creating job record in itinerary_generation_jobs...');
  const webhookUrl = "/api/ai/generate-itinerary";
  
  const { data: jobRecord, error: jobError } = await supabaseService
    .from('itinerary_generation_jobs')
    .insert({
      trip_id: tripId,
      status: 'pending',
      request_payload: requestPayload as any,
      webhook_url: webhookUrl,
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (jobError || !jobRecord) {
    console.error('❌ STEP 5 FAILED: Error creating job record:', jobError);
    throw new Error(`Failed to create job record: ${jobError?.message}`);
  }

  console.log('✅ STEP 5 PASSED: Job record created:', jobRecord.id);

  // Set trip status to generating
  console.log('🔍 STEP 6: Setting trip status to generating...');
  const { error: statusError } = await supabaseService
    .from('trips')
    .update({ 
      itinerary_status: 'generating',
      itinerary_generated_at: null 
    })
    .eq('id', tripId);

  if (statusError) {
    console.error('❌ STEP 6 FAILED: Error setting trip status:', statusError);
    throw statusError;
  }

  console.log('✅ STEP 6 PASSED: Trip status set to generating');

  // Start background processing (don't await)
  console.log('🚀 STEP 7: Starting background job processing...');
  processItineraryInBackground(tripId, jobRecord.id).catch(error => {
    console.error('💥 Background itinerary generation failed:', error);
  });

  console.log('✅ STEP 7 PASSED: Background job started - returning immediately');
  // Return immediately - UI will poll for status updates
};

/**
 * Parse time slot string to start and end times
 */
const parseTimeSlot = (timeSlot: string): { start: string | null; end: string | null } => {
  try {
    // Handle formats like "9:00 AM - 11:00 AM"
    const match = timeSlot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (match) {
      return {
        start: convertTo24Hour(match[1].trim()),
        end: convertTo24Hour(match[2].trim())
      };
    }
    
    // Handle single time format like "9:00 AM"
    const singleMatch = timeSlot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (singleMatch) {
      return {
        start: convertTo24Hour(singleMatch[1].trim()),
        end: null
      };
    }
    
    return { start: null, end: null };
  } catch (error) {
    console.warn('Failed to parse time slot:', timeSlot, error);
    return { start: null, end: null };
  }
};

/**
 * Convert 12-hour time to 24-hour format
 */
const convertTo24Hour = (time12h: string): string => {
  try {
    const [time, modifier] = time12h.split(/\s*(AM|PM)/i);
    let [hours, minutes] = time.split(':').map(Number);
    
    if (modifier.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (modifier.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  } catch (error) {
    console.warn('Failed to convert time to 24h format:', time12h, error);
    return '00:00:00';
  }
};
