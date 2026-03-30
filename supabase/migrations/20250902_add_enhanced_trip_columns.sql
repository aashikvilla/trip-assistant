-- Add enhanced columns to trips table
ALTER TABLE trips ADD COLUMN travel_style TEXT CHECK (travel_style IN ('solo', 'couple', 'family', 'friends', 'business'));
ALTER TABLE trips ADD COLUMN vibe TEXT CHECK (vibe IN ('relaxed', 'adventure', 'cultural', 'romantic', 'party', 'luxury', 'budget'));
ALTER TABLE trips ADD COLUMN budget TEXT CHECK (budget IN ('low', 'mid', 'high'));
ALTER TABLE trips ADD COLUMN must_do TEXT[]; -- Simple array like destinations
ALTER TABLE trips ADD COLUMN hotel_recommendations JSONB;
ALTER TABLE trips ADD COLUMN local_travel_info JSONB;
