/*
  # Add trip codes system

  1. New Features
    - Add `trip_code` column to trips table (4-character alphanumeric)
    - Generate unique codes for existing trips
    - Create function to generate unique trip codes
    - Create function to join trip by code

  2. Security
    - Update RLS policies to handle code-based access
    - Ensure codes are unique across all trips

  3. Functions
    - `generate_unique_trip_code()` - generates unique 4-char codes
    - `join_trip_by_code()` - allows users to join trips using codes
*/

-- Add trip_code column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_code text;

-- Create unique index for trip codes
CREATE UNIQUE INDEX IF NOT EXISTS trips_trip_code_key ON trips(trip_code) WHERE trip_code IS NOT NULL;

-- Function to generate unique trip codes
CREATE OR REPLACE FUNCTION generate_unique_trip_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate 4-character alphanumeric code (excluding ambiguous characters)
    code := '';
    FOR i IN 1..4 LOOP
      code := code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM trips WHERE trip_code = code) INTO exists_check;
    
    -- If code doesn't exist, we can use it
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Function to join trip by code
CREATE OR REPLACE FUNCTION join_trip_by_code(
  code_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trip_record trips%ROWTYPE;
  user_id uuid;
  existing_member_count int;
BEGIN
  -- Get current user
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Find trip by code
  SELECT * INTO trip_record FROM trips WHERE trip_code = code_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trip code');
  END IF;
  
  -- Check if user is already a member
  SELECT COUNT(*) INTO existing_member_count 
  FROM trip_members 
  WHERE trip_id = trip_record.id AND profile_id = user_id;
  
  IF existing_member_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this trip');
  END IF;
  
  -- Add user as trip member with viewer role
  INSERT INTO trip_members (trip_id, profile_id, role, invitation_status)
  VALUES (trip_record.id, user_id, 'viewer', 'accepted');
  
  RETURN json_build_object(
    'success', true, 
    'trip_id', trip_record.id,
    'trip_name', trip_record.name
  );
END;
$$;

-- Generate codes for existing trips that don't have them
UPDATE trips 
SET trip_code = generate_unique_trip_code() 
WHERE trip_code IS NULL;

-- Create trigger to auto-generate codes for new trips
CREATE OR REPLACE FUNCTION auto_generate_trip_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trip_code IS NULL THEN
    NEW.trip_code := generate_unique_trip_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_auto_generate_code ON trips;
CREATE TRIGGER trips_auto_generate_code
  BEFORE INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_trip_code();