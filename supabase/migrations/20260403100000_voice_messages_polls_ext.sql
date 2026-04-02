-- ============================================================
-- Migration: Voice Messages + Polls Extensions
-- ============================================================

-- 1. Allow 'voice' as a valid message_type in trip_messages
-- ============================================================

-- Drop old check constraint (name may vary; we catch both variants)
DO $$
BEGIN
  -- Try to drop constraint by common names; ignore if not found
  BEGIN
    ALTER TABLE trip_messages DROP CONSTRAINT IF EXISTS trip_messages_message_type_check;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE trip_messages DROP CONSTRAINT IF EXISTS check_message_type;
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$$;

ALTER TABLE trip_messages
  ADD CONSTRAINT trip_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'poll', 'system', 'voice'));

-- 2. Create voice-messages storage bucket (idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-messages',
  'voice-messages',
  false,
  10485760, -- 10 MB
  ARRAY['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: trip members can read voice files for their trips
CREATE POLICY IF NOT EXISTS "trip_members_read_voice_messages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-messages' AND
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id::text = (storage.foldername(name))[1]
        AND tm.user_id = auth.uid()
        AND tm.invitation_status = 'accepted'
    )
  );

-- Storage RLS: authenticated users can upload voice files
CREATE POLICY IF NOT EXISTS "authenticated_insert_voice_messages"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages' AND
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id::text = (storage.foldername(name))[1]
        AND tm.user_id = auth.uid()
        AND tm.invitation_status = 'accepted'
    )
  );

-- 3. Polls extensions: expires_at and is_important
-- ============================================================
ALTER TABLE trip_polls
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nudge_cooldown_until TIMESTAMPTZ;

-- 4. Unique constraint on (poll_id, user_id) in trip_poll_votes
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trip_poll_votes_poll_id_user_id_key'
  ) THEN
    ALTER TABLE trip_poll_votes
      ADD CONSTRAINT trip_poll_votes_poll_id_user_id_key UNIQUE (poll_id, user_id);
  END IF;
END;
$$;

-- 5. trip_notifications table
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  poll_id UUID REFERENCES trip_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('poll_deadline_24h', 'poll_overdue', 'poll_nudge')),
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id, type)
);

-- RLS for trip_notifications
ALTER TABLE trip_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_notifications"
  ON trip_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "service_insert_notifications"
  ON trip_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_notifications.trip_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
        AND tm.invitation_status = 'accepted'
    )
  );

CREATE POLICY IF NOT EXISTS "users_update_own_notifications"
  ON trip_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 6. Index for fast non-responder / deadline queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trip_poll_votes_poll_id ON trip_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_user_id ON trip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_poll_id ON trip_notifications(poll_id);
CREATE INDEX IF NOT EXISTS idx_trip_polls_expires_at ON trip_polls(expires_at) WHERE is_closed = FALSE;

-- 7. Auto-close polls when expires_at passes (checked by cron)
-- The cron endpoint /api/polls/check-deadlines handles this.
-- No DB trigger to avoid complexity; cron is sufficient.
