-- Create RPC function for joining trips by code
CREATE OR REPLACE FUNCTION join_trip_by_code(code_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trip_record record;
    user_id uuid;
    result json;
BEGIN
    -- Get the current user ID
    user_id := auth.uid();
    
    -- Check if user is authenticated
    IF user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Authentication required'
        );
    END IF;
    
    -- Find the trip with the given code
    SELECT id, name, created_by
    INTO trip_record
    FROM public.trips
    WHERE code = UPPER(code_param);
    
    -- Check if trip exists
    IF trip_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid trip code'
        );
    END IF;
    
    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM public.trip_members 
        WHERE trip_id = trip_record.id 
        AND profile_id = user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You are already a member of this trip'
        );
    END IF;
    
    -- Add user to the trip
    INSERT INTO public.trip_members (trip_id, profile_id, role, invitation_status)
    VALUES (trip_record.id, user_id, 'viewer', 'accepted');
    
    -- Return success response
    RETURN json_build_object(
        'success', true,
        'trip_id', trip_record.id,
        'trip_name', trip_record.name
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to join trip: ' || SQLERRM
        );
END;
$$;
