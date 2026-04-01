/*
  # Add travel preferences columns to profiles table

  1. New Columns
    - `interests` (text array) - User's activity interests like hiking, food, museums
    - `loyalty_programs` (jsonb) - Airline, hotel, and credit card loyalty programs
    - `dietary_needs` (text array) - Dietary restrictions and preferences
    - `allergies` (text) - Free-text field for allergies and special dietary notes
    - `preferences_completed` (boolean) - Track if user completed onboarding preferences

  2. Changes
    - Add new columns to profiles table with appropriate defaults
    - Update existing records to have default values for new columns
*/

-- Add interests column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'interests'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
  END IF;
END $$;

-- Add loyalty_programs column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'loyalty_programs'
  ) THEN
    ALTER TABLE profiles ADD COLUMN loyalty_programs jsonb DEFAULT '{"airlines": [], "hotels": [], "creditCards": []}';
  END IF;
END $$;

-- Add dietary_needs column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dietary_needs'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dietary_needs text[] DEFAULT '{}';
  END IF;
END $$;

-- Add allergies column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE profiles ADD COLUMN allergies text DEFAULT '';
  END IF;
END $$;

-- Add preferences_completed column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferences_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferences_completed boolean DEFAULT false;
  END IF;
END $$;