-- Extend trip_notifications to support invitation notifications
-- ============================================================

-- Relax the type check constraint to include invitation types
ALTER TABLE trip_notifications DROP CONSTRAINT IF EXISTS trip_notifications_type_check;
ALTER TABLE trip_notifications
  ADD CONSTRAINT trip_notifications_type_check
  CHECK (type IN (
    'poll_deadline_24h', 'poll_overdue', 'poll_nudge',
    'trip_invitation', 'invitation_accepted'
  ));

-- Drop the unique constraint that requires poll_id (which is NULL for invitations)
-- and replace with a partial unique index
ALTER TABLE trip_notifications DROP CONSTRAINT IF EXISTS trip_notifications_poll_id_user_id_type_key;

-- Unique per poll-based notification
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_notifications_poll_unique
  ON trip_notifications (poll_id, user_id, type)
  WHERE poll_id IS NOT NULL;

-- Allow poll_id to be nullable (it already is from the migration, but ensure)
-- No change needed since it was already REFERENCES ... ON DELETE CASCADE

-- Add email column to profiles if not exists (needed for email-based lookup)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Function to auto-populate email on profiles from auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to keep email in sync
DROP TRIGGER IF EXISTS on_auth_user_update_email ON auth.users;
CREATE TRIGGER on_auth_user_update_email
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Backfill existing profiles with email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');
