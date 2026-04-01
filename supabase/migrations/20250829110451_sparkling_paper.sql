/*
  # Fix trips table RLS policy

  1. Security Updates
    - Update RLS policy for trips insertion to work with auth.uid()
    - Ensure proper foreign key relationship with profiles table
    - Add policy to allow users to insert trips where created_by matches their profile

  2. Changes
    - Update INSERT policy to check against profiles table properly
    - Ensure created_by field works with current user authentication
*/

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Trips: insert when creator is user" ON trips;

-- Create new INSERT policy that properly handles the relationship
CREATE POLICY "Trips: insert when creator is user" ON trips
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Ensure we have a policy for users to read their own trips
DROP POLICY IF EXISTS "Trips: select if member" ON trips;
CREATE POLICY "Trips: select if member" ON trips
  FOR SELECT 
  TO authenticated 
  USING (
    created_by = auth.uid() OR 
    is_trip_member(auth.uid(), id)
  );