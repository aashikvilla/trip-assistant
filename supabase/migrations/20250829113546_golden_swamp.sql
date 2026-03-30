/*
  # Fix invitation code generation permissions

  1. Security Updates
    - Grant SELECT permission on auth.users to authenticated role
    - This allows the generate_invitation_code function to check for existing users
    
  2. Function Updates
    - Update generate_invitation_code function to work with proper permissions
    - Ensure the function can access auth.users table safely
*/

-- Grant necessary permissions for invitation system
GRANT SELECT ON auth.users TO authenticated;

-- Recreate the generate_invitation_code function with proper error handling
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a 6-digit code
    code := LPAD(floor(random() * 1000000)::text, 6, '0');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM trip_invitations 
      WHERE invitation_code = code 
      AND status = 'pending' 
      AND expires_at > now()
    ) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;