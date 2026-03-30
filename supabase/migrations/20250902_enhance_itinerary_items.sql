-- Enhance existing itinerary_items table
ALTER TABLE itinerary_items ADD COLUMN time_slot TEXT; -- e.g., "9:00 AM - 11:00 AM"
ALTER TABLE itinerary_items ADD COLUMN activity_description TEXT;
ALTER TABLE itinerary_items ADD COLUMN trivia TEXT;
ALTER TABLE itinerary_items ADD COLUMN food_suggestion TEXT;
ALTER TABLE itinerary_items ADD COLUMN external_link TEXT;
ALTER TABLE itinerary_items ADD COLUMN day_number INTEGER;
ALTER TABLE itinerary_items ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
