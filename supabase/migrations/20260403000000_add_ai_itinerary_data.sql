-- Add ai_itinerary_data column to trips table
-- This column stores the full AI-generated itinerary as JSON
-- Without it, the orchestrator's persistItinerary update fails silently,
-- preventing itinerary_status from being updated to 'completed'.
ALTER TABLE trips ADD COLUMN ai_itinerary_data jsonb DEFAULT NULL;

COMMENT ON COLUMN trips.ai_itinerary_data IS 'Full AI-generated itinerary stored as JSON';
