-- Create trip_preferences table
CREATE TABLE IF NOT EXISTS public.trip_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Store all preferences in a JSONB column for flexibility
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT trip_preferences_trip_id_user_id_key UNIQUE (trip_id, user_id)
);

-- Enable RLS
ALTER TABLE public.trip_preferences ENABLE ROW LEVEL SECURITY;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trip_preferences_trip_id ON public.trip_preferences (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_preferences_user_id ON public.trip_preferences (user_id);

-- Create policy to allow users to read/write their own preferences
CREATE POLICY "Users can view their own trip preferences"
  ON public.trip_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip preferences"
  ON public.trip_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow trip members to view preferences (optional, adjust based on requirements)
CREATE POLICY "Trip members can view preferences"
  ON public.trip_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = trip_preferences.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_trip_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_preferences_updated_at
BEFORE UPDATE ON public.trip_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_trip_preferences_updated_at();

-- Add comment
COMMENT ON TABLE public.trip_preferences IS 'Stores user preferences for trips, including travel styles, budget, and other customizations.';
