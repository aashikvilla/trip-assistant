-- Add code column to trips table for join functionality
ALTER TABLE public.trips ADD COLUMN code text UNIQUE DEFAULT generate_trip_code();

-- Create index for faster lookups
CREATE INDEX idx_trips_code ON public.trips(code);

-- Function to generate a random 4-character trip code
CREATE OR REPLACE FUNCTION generate_trip_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result text := '';
    i integer;
    code_exists boolean := true;
BEGIN
    -- Keep generating until we find a unique code
    WHILE code_exists LOOP
        result := '';
        -- Generate 4 random characters
        FOR i IN 1..4 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Check if this code already exists
        SELECT EXISTS(SELECT 1 FROM public.trips WHERE code = result) INTO code_exists;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Function to auto-generate trip code on insert
CREATE OR REPLACE FUNCTION set_trip_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only set code if it's not already provided
    IF NEW.code IS NULL THEN
        NEW.code := generate_trip_code();
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger to auto-generate trip codes
DROP TRIGGER IF EXISTS trips_set_code ON public.trips;
CREATE TRIGGER trips_set_code
    BEFORE INSERT ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION set_trip_code();

-- Update existing trips to have codes (if any exist)
UPDATE public.trips SET code = generate_trip_code() WHERE code IS NULL;

-- Make code column NOT NULL after setting values
ALTER TABLE public.trips ALTER COLUMN code SET NOT NULL;
