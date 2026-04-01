/*
  # Add travel_style column to trips table

  1. New Types
    - `trip_travel_style` enum with values: 'solo', 'couple', 'family', 'friends'

  2. Schema Changes
    - Add `travel_style` column to `trips` table
    - Column is nullable to support existing trips

  3. Security
    - No RLS changes needed as existing policies will cover the new column
*/

-- Create enum for trip travel styles
CREATE TYPE trip_travel_style AS ENUM ('solo', 'couple', 'family', 'friends');

-- Add travel_style column to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'travel_style'
  ) THEN
    ALTER TABLE trips ADD COLUMN travel_style trip_travel_style;
  END IF;
END $$;