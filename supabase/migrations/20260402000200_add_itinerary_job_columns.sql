-- Add missing columns to itinerary_generation_jobs table
ALTER TABLE itinerary_generation_jobs
ADD COLUMN started_at timestamptz DEFAULT NULL,
ADD COLUMN updated_at timestamptz DEFAULT NOW();

-- Update status constraint to include streaming and cancelled
ALTER TABLE itinerary_generation_jobs
DROP CONSTRAINT if exists itinerary_generation_jobs_status_check;

ALTER TABLE itinerary_generation_jobs
ADD CONSTRAINT itinerary_generation_jobs_status_check
  CHECK (status IN ('pending', 'processing', 'streaming', 'completed', 'failed', 'cancelled'));
