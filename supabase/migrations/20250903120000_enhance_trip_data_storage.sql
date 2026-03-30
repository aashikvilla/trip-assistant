-- Enhanced Trip Data Storage Migration
-- Phase 5: Add columns for enhanced trip data, hotel recommendations, and local travel info

-- Add enhanced columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS travel_style TEXT CHECK (travel_style IN ('solo', 'couple', 'family', 'friends', 'business')),
ADD COLUMN IF NOT EXISTS vibe TEXT CHECK (vibe IN ('relaxed', 'adventure', 'cultural', 'romantic', 'party', 'luxury', 'budget')),
ADD COLUMN IF NOT EXISTS budget TEXT CHECK (budget IN ('low', 'mid', 'high')),
ADD COLUMN IF NOT EXISTS must_do TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hotel_recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS local_travel_info JSONB DEFAULT '{}'::jsonb;

-- Enhance itinerary_items table with new columns
ALTER TABLE public.itinerary_items 
ADD COLUMN IF NOT EXISTS time_slot TEXT,
ADD COLUMN IF NOT EXISTS activity_description TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS cost_estimate TEXT,
ADD COLUMN IF NOT EXISTS trivia TEXT,
ADD COLUMN IF NOT EXISTS food_suggestion TEXT,
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS day_number INTEGER,
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activity_type TEXT CHECK (activity_type IN (
  'sightseeing', 'dining', 'entertainment', 'shopping', 'outdoor', 
  'cultural', 'relaxation', 'transportation', 'accommodation'
)) DEFAULT 'sightseeing',
ADD COLUMN IF NOT EXISTS booking_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS weather_dependent BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_travel_style ON public.trips (travel_style);
CREATE INDEX IF NOT EXISTS idx_trips_vibe ON public.trips (vibe);
CREATE INDEX IF NOT EXISTS idx_trips_budget ON public.trips (budget);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_number ON public.itinerary_items (trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_activity_type ON public.itinerary_items (activity_type);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_is_ai_generated ON public.itinerary_items (is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_time_slot ON public.itinerary_items (day_number, time_slot);

-- Create a function to validate hotel recommendations JSONB structure
CREATE OR REPLACE FUNCTION validate_hotel_recommendations(recommendations JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's an array
  IF jsonb_typeof(recommendations) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Check each recommendation has required fields
  FOR i IN 0..jsonb_array_length(recommendations) - 1 LOOP
    IF NOT (
      recommendations->i ? 'name' AND
      recommendations->i ? 'location' AND
      recommendations->i ? 'description'
    ) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate local travel info JSONB structure
CREATE OR REPLACE FUNCTION validate_local_travel_info(travel_info JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's an object
  IF jsonb_typeof(travel_info) != 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if tips is an array when present
  IF travel_info ? 'tips' AND jsonb_typeof(travel_info->'tips') != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if weather_advice is a string when present
  IF travel_info ? 'weather_advice' AND jsonb_typeof(travel_info->'weather_advice') != 'string' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraints for JSONB validation
ALTER TABLE public.trips 
ADD CONSTRAINT check_hotel_recommendations_format 
CHECK (validate_hotel_recommendations(hotel_recommendations));

ALTER TABLE public.trips 
ADD CONSTRAINT check_local_travel_info_format 
CHECK (validate_local_travel_info(local_travel_info));

-- Create a function to calculate trip statistics
CREATE OR REPLACE FUNCTION get_trip_statistics(trip_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_days INTEGER;
  total_activities INTEGER;
  ai_generated_count INTEGER;
  manual_count INTEGER;
  activities_by_type JSONB;
BEGIN
  -- Calculate basic statistics
  SELECT 
    EXTRACT(DAY FROM (end_date - start_date)) + 1,
    COUNT(ii.id),
    COUNT(ii.id) FILTER (WHERE ii.is_ai_generated = TRUE),
    COUNT(ii.id) FILTER (WHERE ii.is_ai_generated = FALSE)
  INTO total_days, total_activities, ai_generated_count, manual_count
  FROM trips t
  LEFT JOIN itinerary_items ii ON t.id = ii.trip_id
  WHERE t.id = trip_uuid
  GROUP BY t.id, t.start_date, t.end_date;

  -- Calculate activities by type
  SELECT jsonb_object_agg(activity_type, count)
  INTO activities_by_type
  FROM (
    SELECT 
      COALESCE(activity_type, 'sightseeing') as activity_type,
      COUNT(*) as count
    FROM itinerary_items 
    WHERE trip_id = trip_uuid
    GROUP BY activity_type
  ) type_counts;

  -- Build result object
  result := jsonb_build_object(
    'totalDays', COALESCE(total_days, 0),
    'totalActivities', COALESCE(total_activities, 0),
    'aiGeneratedActivities', COALESCE(ai_generated_count, 0),
    'manualActivities', COALESCE(manual_count, 0),
    'activitiesByType', COALESCE(activities_by_type, '{}'::jsonb),
    'averageActivitiesPerDay', 
    CASE 
      WHEN COALESCE(total_days, 0) > 0 THEN ROUND(COALESCE(total_activities, 0)::numeric / total_days, 2)
      ELSE 0
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function for bulk inserting itinerary items
CREATE OR REPLACE FUNCTION bulk_insert_itinerary_items(
  p_trip_id UUID,
  p_items JSONB,
  p_clear_existing BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
  item JSONB;
BEGIN
  -- Clear existing items if requested
  IF p_clear_existing THEN
    DELETE FROM itinerary_items WHERE trip_id = p_trip_id;
  END IF;

  -- Insert new items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO itinerary_items (
      trip_id,
      day_number,
      time_slot,
      name,
      activity_description,
      location,
      duration_minutes,
      cost_estimate,
      trivia,
      food_suggestion,
      external_link,
      is_ai_generated,
      activity_type,
      booking_required,
      weather_dependent
    ) VALUES (
      p_trip_id,
      (item->>'day_number')::INTEGER,
      item->>'time_slot',
      item->>'activity_name',
      item->>'description',
      item->>'location',
      (item->>'duration_minutes')::INTEGER,
      item->>'cost_estimate',
      item->>'trivia',
      item->>'food_suggestion',
      item->>'external_link',
      COALESCE((item->>'is_ai_generated')::BOOLEAN, TRUE),
      COALESCE(item->>'activity_type', 'sightseeing'),
      COALESCE((item->>'booking_required')::BOOLEAN, FALSE),
      COALESCE((item->>'weather_dependent')::BOOLEAN, FALSE)
    );
    
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for enhanced data
CREATE POLICY "Users can view enhanced trip data for their trips"
  ON public.trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN public.trips.travel_style IS 'Travel style preference for the trip';
COMMENT ON COLUMN public.trips.vibe IS 'Overall vibe/mood for the trip';
COMMENT ON COLUMN public.trips.budget IS 'Budget level for the trip';
COMMENT ON COLUMN public.trips.must_do IS 'Array of must-do activities specified by users';
COMMENT ON COLUMN public.trips.hotel_recommendations IS 'AI-generated hotel recommendations in JSONB format';
COMMENT ON COLUMN public.trips.local_travel_info IS 'Local travel information and tips in JSONB format';

COMMENT ON COLUMN public.itinerary_items.time_slot IS 'Time slot for the activity (e.g., "9:00 AM - 11:00 AM")';
COMMENT ON COLUMN public.itinerary_items.activity_description IS 'Detailed description of the activity';
COMMENT ON COLUMN public.itinerary_items.day_number IS 'Day number of the trip (1-based)';
COMMENT ON COLUMN public.itinerary_items.is_ai_generated IS 'Whether this activity was generated by AI';
COMMENT ON COLUMN public.itinerary_items.activity_type IS 'Type/category of the activity';

COMMENT ON FUNCTION get_trip_statistics(UUID) IS 'Returns comprehensive statistics for a trip';
COMMENT ON FUNCTION bulk_insert_itinerary_items(UUID, JSONB, BOOLEAN) IS 'Bulk insert itinerary items with optional clearing of existing items';
