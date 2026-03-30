/*
  # Create trip invitations system

  1. New Tables
    - `trip_invitations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `invited_by` (uuid, foreign key to profiles)
      - `email` (text, email of invitee)
      - `invitation_code` (text, unique 6-digit code)
      - `invitation_token` (text, unique token for shareable links)
      - `role` (trip_member_role, default viewer)
      - `status` (invitation_status, default pending)
      - `expires_at` (timestamp, default 7 days from creation)
      - `accepted_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `trip_invitations` table
    - Add policies for trip owners/editors to manage invitations
    - Add policy for invited users to view their own invitations

  3. Functions
    - Function to generate unique invitation codes
    - Function to accept invitations and create trip memberships
*/

-- Create trip invitations table
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  email text NOT NULL,
  invitation_code text UNIQUE NOT NULL,
  invitation_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  role trip_member_role NOT NULL DEFAULT 'viewer',
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email ON trip_invitations(email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_code ON trip_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token ON trip_invitations(invitation_token);

-- Function to generate unique 6-digit invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 6-digit code
    code := LPAD(floor(random() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM trip_invitations WHERE invitation_code = code) INTO exists;
    
    -- If code doesn't exist, return it
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_trip_invitation(invitation_token_param text)
RETURNS json AS $$
DECLARE
  invitation_record trip_invitations%ROWTYPE;
  user_id uuid;
  result json;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM trip_invitations
  WHERE invitation_token = invitation_token_param
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS(
    SELECT 1 FROM trip_members 
    WHERE trip_id = invitation_record.trip_id 
    AND profile_id = user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this trip');
  END IF;
  
  -- Add user to trip
  INSERT INTO trip_members (trip_id, profile_id, role, invitation_status)
  VALUES (invitation_record.trip_id, user_id, invitation_record.role, 'accepted');
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = invitation_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'trip_id', invitation_record.trip_id,
    'role', invitation_record.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Invitations: select if trip member or invitee"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    is_trip_member(auth.uid(), trip_id) OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Invitations: insert if trip owner/editor"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_trip_role(auth.uid(), trip_id, ARRAY['owner'::trip_member_role, 'editor'::trip_member_role])
  );

CREATE POLICY "Invitations: update if trip owner/editor"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    has_trip_role(auth.uid(), trip_id, ARRAY['owner'::trip_member_role, 'editor'::trip_member_role])
  )
  WITH CHECK (
    has_trip_role(auth.uid(), trip_id, ARRAY['owner'::trip_member_role, 'editor'::trip_member_role])
  );

CREATE POLICY "Invitations: delete if trip owner/editor"
  ON trip_invitations
  FOR DELETE
  TO authenticated
  USING (
    has_trip_role(auth.uid(), trip_id, ARRAY['owner'::trip_member_role, 'editor'::trip_member_role])
  );

-- Add updated_at trigger
CREATE TRIGGER trip_invitations_set_updated_at
  BEFORE UPDATE ON trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();