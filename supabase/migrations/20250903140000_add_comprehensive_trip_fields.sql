-- Add comprehensive trip fields for N8N integration
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS travel_style TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS vibe TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget TEXT CHECK (budget IN ('low', 'mid', 'high'));
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('light', 'moderate', 'active'));
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS must_do_activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb;

-- Add hotel recommendations and enhanced itinerary data
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS hotel_recommendations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS local_travel_info JSONB DEFAULT '{}'::jsonb;

-- Add member interests and dietary preferences to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb;

-- Create function to validate hotel recommendations structure
CREATE OR REPLACE FUNCTION validate_hotel_recommendations(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's an array
  IF jsonb_typeof(data) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Check each hotel object has required fields
  RETURN (
    SELECT bool_and(
      jsonb_typeof(hotel) = 'object' AND
      hotel ? 'name' AND
      hotel ? 'location' AND
      hotel ? 'description'
    )
    FROM jsonb_array_elements(data) AS hotel
  );
END;
$$ LANGUAGE plpgsql;

-- Add constraint for hotel recommendations
ALTER TABLE public.trips ADD CONSTRAINT valid_hotel_recommendations 
  CHECK (validate_hotel_recommendations(hotel_recommendations));

-- Create function to validate must-do activities structure
CREATE OR REPLACE FUNCTION validate_must_do_activities(data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's an array of strings
  RETURN (
    jsonb_typeof(data) = 'array' AND
    (SELECT bool_and(jsonb_typeof(activity) = 'string')
     FROM jsonb_array_elements(data) AS activity)
  );
END;
$$ LANGUAGE plpgsql;

-- Add constraint for must-do activities
ALTER TABLE public.trips ADD CONSTRAINT valid_must_do_activities 
  CHECK (validate_must_do_activities(must_do_activities));

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_trips_travel_style ON public.trips (travel_style);
CREATE INDEX IF NOT EXISTS idx_trips_budget ON public.trips (budget);
CREATE INDEX IF NOT EXISTS idx_trips_activity_level ON public.trips (activity_level);

-- Update RLS policies to include new fields (they inherit from existing trip policies)

-- Create function to aggregate dietary preferences from trip members
CREATE OR REPLACE FUNCTION get_trip_dietary_preferences(trip_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  dietary_prefs JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(DISTINCT dietary_pref),
    '[]'::jsonb
  ) INTO dietary_prefs
  FROM (
    SELECT jsonb_array_elements_text(p.dietary_preferences) as dietary_pref
    FROM trip_members tm
    JOIN profiles p ON tm.user_id = p.id
    WHERE tm.trip_id = trip_id_param
    AND p.dietary_preferences IS NOT NULL
    AND jsonb_array_length(p.dietary_preferences) > 0
  ) AS all_prefs;
  
  RETURN dietary_prefs;
END;
$$ LANGUAGE plpgsql;

-- Create function to aggregate interests from trip members
CREATE OR REPLACE FUNCTION get_trip_member_interests(trip_id_param UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', 'traveler_' || ROW_NUMBER() OVER(),
          'interests', p.interests
        )
      ),
      '[]'::jsonb
    )
    FROM trip_members tm
    JOIN profiles p ON tm.user_id = p.id
    WHERE tm.trip_id = trip_id_param
    AND p.interests IS NOT NULL
    AND jsonb_array_length(p.interests) > 0
  );
END;
$$ LANGUAGE plpgsql;
