-- Add itinerary_status column to trips table
ALTER TABLE trips
ADD COLUMN itinerary_status text DEFAULT NULL,
ADD COLUMN itinerary_generated_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN trips.itinerary_status IS 'Status of AI itinerary generation: null, generating, completed, failed';
COMMENT ON COLUMN trips.itinerary_generated_at IS 'Timestamp when itinerary generation was completed';
