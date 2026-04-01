-- Create a function to add the creator as a trip member with owner role
CREATE OR REPLACE FUNCTION public.add_creator_as_trip_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as a trip member with owner role
  INSERT INTO public.trip_members (trip_id, profile_id, role, invitation_status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'accepted');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function after a trip is inserted
DROP TRIGGER IF EXISTS trg_add_creator_as_trip_member ON public.trips;
CREATE TRIGGER trg_add_creator_as_trip_member
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_trip_member();

-- Update the RLS policy to ensure users can see their own created trips
DROP POLICY IF EXISTS "Trips: select if member" ON public.trips;
CREATE POLICY "Trips: select if member" ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    -- Allow access if user is the creator
    created_by = auth.uid() OR 
    -- OR if user is an accepted member of the trip
    public.is_trip_member(auth.uid(), id)
  );

-- For existing trips, ensure they have a trip code
UPDATE public.trips 
SET trip_code = 
  CASE 
    WHEN trip_code IS NULL THEN 
      (SELECT array_to_string(array(
        SELECT substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (random() * 36)::int + 1, 1)
        FROM generate_series(1, 4)), ''))
    ELSE trip_code
  END
WHERE trip_code IS NULL;

-- Make trip_code non-nullable
ALTER TABLE public.trips ALTER COLUMN trip_code SET NOT NULL;

-- For existing trips, add the creator as a trip member if not already present
INSERT INTO public.trip_members (trip_id, profile_id, role, invitation_status)
SELECT t.id, t.created_by, 'owner', 'accepted'
FROM public.trips t
LEFT JOIN public.trip_members tm ON t.id = tm.trip_id AND t.created_by = tm.profile_id
WHERE tm.id IS NULL;
