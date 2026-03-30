/*
  # Fix trips table RLS policies and ensure proper user profile setup

  1. Security Updates
    - Fix INSERT policy for trips table to work with auth.uid()
    - Update SELECT policy to properly handle user access
    - Ensure users can create and view their own trips

  2. Notes
    - The created_by field should reference the user's auth.uid() directly
    - This aligns with how Supabase auth works by default
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Trips: insert when creator is user" ON trips;
DROP POLICY IF EXISTS "Trips: select if member" ON trips;

-- Create new working policies
CREATE POLICY "Trips: users can insert own trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Trips: users can view own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR is_trip_member(auth.uid(), id));

-- Ensure the foreign key constraint is correct
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_created_by_fkey;
ALTER TABLE trips ADD CONSTRAINT trips_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT;