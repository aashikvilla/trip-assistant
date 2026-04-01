/*
  # Add travel preferences columns to users table

  1. New Columns
    - `interests` (text array) - User's activity interests
    - `loyalty_programs` (jsonb) - Airline, hotel, and credit card loyalty programs
    - `dietary_needs` (text array) - Dietary restrictions and preferences
    - `allergies` (text) - Free-text field for allergies
    - `preferences_completed` (boolean) - Track if user completed onboarding

  2. Changes
    - Add new columns to users table with appropriate defaults
    - Update existing records to have default values
*/

-- Add new columns to users table
DO $$
BEGIN
  -- Add interests column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'interests'
  ) THEN
    ALTER TABLE users ADD COLUMN interests text[] DEFAULT '{}';
  END IF;

  -- Add loyalty_programs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'loyalty_programs'
  ) THEN
    ALTER TABLE users ADD COLUMN loyalty_programs jsonb DEFAULT '{"airlines": [], "hotels": [], "creditCards": []}';
  END IF;

  -- Add dietary_needs column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'dietary_needs'
  ) THEN
    ALTER TABLE users ADD COLUMN dietary_needs text[] DEFAULT '{}';
  END IF;

  -- Add allergies column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE users ADD COLUMN allergies text DEFAULT '';
  END IF;

  -- Add preferences_completed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferences_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN preferences_completed boolean DEFAULT false;
  END IF;
END $$;