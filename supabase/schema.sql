-- ============================================================
-- Vibe Trip — Consolidated Schema
-- Generated from 21 migration files. Single source of truth.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.trip_member_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE public.trip_visibility AS ENUM ('private', 'link', 'public');
CREATE TYPE public.booking_type AS ENUM ('flight', 'hotel', 'car', 'activity', 'other');
CREATE TYPE public.itinerary_item_type AS ENUM ('flight', 'lodging', 'transport', 'food', 'activity', 'note', 'other');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- ============================================================
-- UTILITY FUNCTIONS (needed before tables)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    text,
  last_name     text,
  avatar_url    text,
  preferences   jsonb NOT NULL DEFAULT '{}',
  -- onboarding / preference fields
  interests          jsonb NOT NULL DEFAULT '[]',
  loyalty_programs   jsonb NOT NULL DEFAULT '{"airlines": [], "hotels": [], "creditCards": []}',
  dietary_needs      text[] NOT NULL DEFAULT '{}',
  allergies          text NOT NULL DEFAULT '',
  preferences_completed boolean NOT NULL DEFAULT false,
  dietary_preferences   jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: select own"   ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Profiles: update own"   ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles: insert self"  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Allow trip members to view each other's profiles
CREATE POLICY "Profiles: select trip members"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.profile_id = auth.uid()
      AND tm2.profile_id = profiles.id
      AND tm1.invitation_status = 'accepted'
  )
);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- TRIPS
-- ============================================================

-- Validation functions needed before constraint
CREATE OR REPLACE FUNCTION public.validate_hotel_recommendations(data jsonb)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF jsonb_typeof(data) != 'array' THEN RETURN FALSE; END IF;
  RETURN COALESCE(
    (SELECT bool_and(
       jsonb_typeof(hotel) = 'object' AND
       hotel ? 'name' AND hotel ? 'location' AND hotel ? 'description'
     ) FROM jsonb_array_elements(data) AS hotel),
    TRUE  -- empty array is valid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_local_travel_info(data jsonb)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF jsonb_typeof(data) != 'object' THEN RETURN FALSE; END IF;
  IF data ? 'tips' AND jsonb_typeof(data->'tips') != 'array' THEN RETURN FALSE; END IF;
  IF data ? 'weather_advice' AND jsonb_typeof(data->'weather_advice') != 'string' THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$;

CREATE TABLE IF NOT EXISTS public.trips (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name            text NOT NULL,
  description     text,
  start_date      date,
  end_date        date,
  visibility      public.trip_visibility NOT NULL DEFAULT 'private',
  destination_main text,
  cover_image_url text,
  -- trip character
  travel_style    text CHECK (travel_style IN ('solo', 'couple', 'family', 'friends', 'business')),
  vibe            text CHECK (vibe IN ('relaxed', 'adventure', 'cultural', 'romantic', 'party', 'luxury', 'budget', 'adventurous', 'foodie', 'nightlife', 'nature', 'family_friendly')),
  budget          text CHECK (budget IN ('low', 'mid', 'high')),
  activity_level  text CHECK (activity_level IN ('light', 'moderate', 'active')),
  must_do         text[] NOT NULL DEFAULT '{}',
  must_do_activities jsonb NOT NULL DEFAULT '[]',
  dietary_preferences jsonb NOT NULL DEFAULT '[]',
  -- AI outputs
  hotel_recommendations jsonb NOT NULL DEFAULT '[]' CONSTRAINT check_hotel_recommendations_format CHECK (public.validate_hotel_recommendations(hotel_recommendations)),
  local_travel_info     jsonb NOT NULL DEFAULT '{}' CONSTRAINT check_local_travel_info_format CHECK (public.validate_local_travel_info(local_travel_info)),
  -- join code
  trip_code       text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS trips_trip_code_key ON public.trips(trip_code) WHERE trip_code != '';

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trips_set_updated_at ON public.trips;
CREATE TRIGGER trips_set_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_trip_dates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'end_date cannot be before start_date';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_validate_dates ON public.trips;
CREATE TRIGGER trips_validate_dates
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.validate_trip_dates();

-- Auto-generate trip code
CREATE OR REPLACE FUNCTION public.generate_unique_trip_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..4 LOOP
      code := code || substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32 + 1)::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.trips WHERE trip_code = code) INTO exists_check;
    IF NOT exists_check THEN EXIT; END IF;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_trip_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.trip_code IS NULL OR NEW.trip_code = '' THEN
    NEW.trip_code := public.generate_unique_trip_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_auto_generate_code ON public.trips;
CREATE TRIGGER trips_auto_generate_code
  BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_trip_code();

-- ============================================================
-- TRIP MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role             public.trip_member_role NOT NULL DEFAULT 'viewer',
  invitation_status public.invitation_status NOT NULL DEFAULT 'accepted',
  invited_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip    ON public.trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_profile ON public.trip_members(profile_id);

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEMBERSHIP HELPERS (needed for RLS policies)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = _trip_id
      AND tm.profile_id = _user_id
      AND tm.invitation_status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_trip_role(_user_id uuid, _trip_id uuid, roles public.trip_member_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = _trip_id
      AND tm.profile_id = _user_id
      AND tm.role = ANY(roles)
      AND tm.invitation_status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_user_id uuid, _trip_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_trip_role(_user_id, _trip_id, ARRAY['owner']::public.trip_member_role[]);
$$;

-- TRIPS RLS (after helpers are defined)
CREATE POLICY "Trips: select if member or creator"
  ON public.trips FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_trip_member(auth.uid(), id));

CREATE POLICY "Trips: insert when creator is user"
  ON public.trips FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Trips: update if editor or owner"
  ON public.trips FOR UPDATE TO authenticated
  USING (public.has_trip_role(auth.uid(), id, ARRAY['owner','editor']::public.trip_member_role[]))
  WITH CHECK (public.has_trip_role(auth.uid(), id, ARRAY['owner','editor']::public.trip_member_role[]));

CREATE POLICY "Trips: delete if owner"
  ON public.trips FOR DELETE TO authenticated
  USING (public.is_trip_owner(auth.uid(), id));

-- TRIP MEMBERS RLS
CREATE POLICY "TripMembers: select if member"
  ON public.trip_members FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "TripMembers: insert owner only"
  ON public.trip_members FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_owner(auth.uid(), trip_id) OR profile_id = auth.uid());

CREATE POLICY "TripMembers: update owner only"
  ON public.trip_members FOR UPDATE TO authenticated
  USING (public.is_trip_owner(auth.uid(), trip_id))
  WITH CHECK (public.is_trip_owner(auth.uid(), trip_id));

CREATE POLICY "TripMembers: delete owner or self-leave"
  ON public.trip_members FOR DELETE TO authenticated
  USING (public.is_trip_owner(auth.uid(), trip_id) OR profile_id = auth.uid());

-- Auto-add creator as owner
CREATE OR REPLACE FUNCTION public.add_owner_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.trip_members(trip_id, profile_id, role, invitation_status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'accepted')
  ON CONFLICT (trip_id, profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trips_add_owner_membership ON public.trips;
CREATE TRIGGER trips_add_owner_membership
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE PROCEDURE public.add_owner_membership();

-- Join trip by code RPC
CREATE OR REPLACE FUNCTION public.join_trip_by_code(code_param text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  trip_record record;
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT id, name FROM public.trips WHERE trip_code = UPPER(code_param) INTO trip_record;

  IF trip_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid trip code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_record.id AND profile_id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this trip');
  END IF;

  INSERT INTO public.trip_members (trip_id, profile_id, role, invitation_status)
  VALUES (trip_record.id, user_id, 'viewer', 'accepted');

  RETURN json_build_object('success', true, 'trip_id', trip_record.id, 'trip_name', trip_record.name);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to join trip: ' || SQLERRM);
END;
$$;

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type             public.booking_type NOT NULL,
  provider         text,
  confirmation_code text,
  start_time       timestamptz,
  end_time         timestamptz,
  price            numeric(12,2),
  currency         char(3),
  details          jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookings: select if member"      ON public.bookings FOR SELECT TO authenticated USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Bookings: insert if editor/owner" ON public.bookings FOR INSERT TO authenticated WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));
CREATE POLICY "Bookings: update if editor/owner" ON public.bookings FOR UPDATE TO authenticated USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[])) WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));
CREATE POLICY "Bookings: delete if editor/owner" ON public.bookings FOR DELETE TO authenticated USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

DROP TRIGGER IF EXISTS bookings_set_updated_at ON public.bookings;
CREATE TRIGGER bookings_set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ITINERARY ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  created_by       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type             public.itinerary_item_type NOT NULL DEFAULT 'activity',
  title            text NOT NULL,
  notes            text,
  location_name    text,
  location_lat     double precision,
  location_lng     double precision,
  start_time       timestamptz,
  end_time         timestamptz,
  all_day          boolean NOT NULL DEFAULT false,
  order_index      integer,
  booking_id       uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  -- enhanced AI fields
  day_number       integer,
  time_slot        text,
  activity_description text,
  location         text,
  duration_minutes integer,
  cost_estimate    text,
  trivia           text,
  food_suggestion  text,
  external_link    text,
  is_ai_generated  boolean NOT NULL DEFAULT false,
  activity_type    text DEFAULT 'sightseeing' CHECK (activity_type IN ('sightseeing','dining','entertainment','shopping','outdoor','cultural','relaxation','transportation','accommodation')),
  booking_required boolean NOT NULL DEFAULT false,
  weather_dependent boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_trip_time       ON public.itinerary_items(trip_id, start_time);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day       ON public.itinerary_items(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_ai        ON public.itinerary_items(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_type      ON public.itinerary_items(activity_type);

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itinerary: select if member"         ON public.itinerary_items FOR SELECT TO authenticated USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Itinerary: insert if editor/owner"   ON public.itinerary_items FOR INSERT TO authenticated WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));
CREATE POLICY "Itinerary: update if editor/owner"   ON public.itinerary_items FOR UPDATE TO authenticated USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]) OR created_by = auth.uid()) WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]) OR created_by = auth.uid());
CREATE POLICY "Itinerary: delete if editor/owner"   ON public.itinerary_items FOR DELETE TO authenticated USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]) OR created_by = auth.uid());

DROP TRIGGER IF EXISTS itinerary_set_updated_at ON public.itinerary_items;
CREATE TRIGGER itinerary_set_updated_at BEFORE UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ITINERARY GENERATION JOBS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.itinerary_generation_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  progress      integer NOT NULL DEFAULT 0,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

ALTER TABLE public.itinerary_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jobs: select if trip member"
  ON public.itinerary_generation_jobs FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "Jobs: insert if editor/owner"
  ON public.itinerary_generation_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

CREATE POLICY "Jobs: update if editor/owner"
  ON public.itinerary_generation_jobs FOR UPDATE TO authenticated
  USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

-- ============================================================
-- TRIP INVITATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  invited_by       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  email            text NOT NULL,
  invitation_code  text UNIQUE NOT NULL,
  invitation_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  role             public.trip_member_role NOT NULL DEFAULT 'viewer',
  status           public.invitation_status NOT NULL DEFAULT 'pending',
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON public.trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email   ON public.trip_invitations(email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_code    ON public.trip_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token   ON public.trip_invitations(invitation_token);

ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitations: select if trip member or invitee"
  ON public.trip_invitations FOR SELECT TO authenticated
  USING (public.is_trip_member(auth.uid(), trip_id) OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Invitations: insert if owner/editor"
  ON public.trip_invitations FOR INSERT TO authenticated
  WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

CREATE POLICY "Invitations: update if owner/editor"
  ON public.trip_invitations FOR UPDATE TO authenticated
  USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]))
  WITH CHECK (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

CREATE POLICY "Invitations: delete if owner/editor"
  ON public.trip_invitations FOR DELETE TO authenticated
  USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]));

DROP TRIGGER IF EXISTS trip_invitations_set_updated_at ON public.trip_invitations;
CREATE TRIGGER trip_invitations_set_updated_at
  BEFORE UPDATE ON public.trip_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Generate unique 6-digit invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    code := LPAD(floor(random() * 1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.trip_invitations WHERE invitation_code = code AND status = 'pending' AND expires_at > now()) INTO exists_check;
    IF NOT exists_check THEN RETURN code; END IF;
  END LOOP;
END;
$$;

-- Accept invitation RPC
CREATE OR REPLACE FUNCTION public.accept_trip_invitation(invitation_token_param text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inv record;
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO inv FROM public.trip_invitations
  WHERE invitation_token = invitation_token_param AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  IF EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = inv.trip_id AND profile_id = user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this trip');
  END IF;

  INSERT INTO public.trip_members (trip_id, profile_id, role, invitation_status)
  VALUES (inv.trip_id, user_id, inv.role, 'accepted');

  UPDATE public.trip_invitations SET status = 'accepted', accepted_at = now(), updated_at = now() WHERE id = inv.id;

  RETURN json_build_object('success', true, 'trip_id', inv.trip_id, 'role', inv.role);
END;
$$;

-- ============================================================
-- TRIP PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_preferences_trip    ON public.trip_preferences(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_preferences_profile ON public.trip_preferences(profile_id);

ALTER TABLE public.trip_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TripPreferences: select own or member"
  ON public.trip_preferences FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "TripPreferences: insert own"
  ON public.trip_preferences FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND public.is_trip_member(auth.uid(), trip_id));

CREATE POLICY "TripPreferences: update own"
  ON public.trip_preferences FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP TRIGGER IF EXISTS trip_preferences_set_updated_at ON public.trip_preferences;
CREATE TRIGGER trip_preferences_set_updated_at
  BEFORE UPDATE ON public.trip_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description  text,
  amount       numeric(12,2) NOT NULL,
  currency     char(3) NOT NULL DEFAULT 'USD',
  paid_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category     text NOT NULL DEFAULT 'others',
  split_between uuid[] NOT NULL DEFAULT '{}',
  incurred_on  date NOT NULL DEFAULT (now()::date),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses: select if member" ON public.expenses FOR SELECT TO authenticated USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Expenses: insert if member" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Expenses: update if member" ON public.expenses FOR UPDATE TO authenticated USING (public.is_trip_member(auth.uid(), trip_id)) WITH CHECK (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "Expenses: delete if editor/owner or payer" ON public.expenses FOR DELETE TO authenticated USING (public.has_trip_role(auth.uid(), trip_id, ARRAY['owner','editor']::public.trip_member_role[]) OR paid_by = auth.uid());

DROP TRIGGER IF EXISTS expenses_set_updated_at ON public.expenses;
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- EXPENSE PARTICIPANTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expense_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  share_amount numeric(12,2),
  UNIQUE(expense_id, profile_id)
);

ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ExpenseParticipants: select if member"
  ON public.expense_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_trip_member(auth.uid(), e.trip_id)));

CREATE POLICY "ExpenseParticipants: write if member"
  ON public.expense_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_trip_member(auth.uid(), e.trip_id)));

CREATE POLICY "ExpenseParticipants: update if member"
  ON public.expense_participants FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_trip_member(auth.uid(), e.trip_id)));

CREATE POLICY "ExpenseParticipants: delete if member"
  ON public.expense_participants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = expense_id AND public.is_trip_member(auth.uid(), e.trip_id)));

-- ============================================================
-- PAYMENT RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  amount       numeric(12,2) NOT NULL CHECK (amount > 0),
  description  text,
  date         date NOT NULL DEFAULT (now()::date),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_different_users CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_records_trip      ON public.payment_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_from_user ON public.payment_records(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_to_user   ON public.payment_records(to_user_id);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PaymentRecords: select if member" ON public.payment_records FOR SELECT TO authenticated USING (public.is_trip_member(auth.uid(), trip_id));
CREATE POLICY "PaymentRecords: insert if member" ON public.payment_records FOR INSERT TO authenticated WITH CHECK (public.is_trip_member(auth.uid(), trip_id) AND (from_user_id = auth.uid() OR to_user_id = auth.uid()));
CREATE POLICY "PaymentRecords: update if creator or owner" ON public.payment_records FOR UPDATE TO authenticated USING (public.is_trip_member(auth.uid(), trip_id) AND (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id))) WITH CHECK (public.is_trip_member(auth.uid(), trip_id) AND (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id)));
CREATE POLICY "PaymentRecords: delete if creator or owner" ON public.payment_records FOR DELETE TO authenticated USING (public.is_trip_member(auth.uid(), trip_id) AND (from_user_id = auth.uid() OR public.is_trip_owner(auth.uid(), trip_id)));

DROP TRIGGER IF EXISTS payment_records_set_updated_at ON public.payment_records;
CREATE TRIGGER payment_records_set_updated_at BEFORE UPDATE ON public.payment_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CHAT: MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  author_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  message_type varchar(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image','poll','system')),
  reply_to_id  uuid REFERENCES public.trip_messages(id) ON DELETE SET NULL,
  is_edited    boolean NOT NULL DEFAULT false,
  is_deleted   boolean NOT NULL DEFAULT false,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_messages_trip_id    ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at DESC);
CREATE INDEX idx_trip_messages_author_id  ON public.trip_messages(author_id);

ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages: select if member" ON public.trip_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_messages.trip_id AND profile_id = auth.uid()));
CREATE POLICY "Messages: insert if member" ON public.trip_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_messages.trip_id AND profile_id = auth.uid()));
CREATE POLICY "Messages: update own"       ON public.trip_messages FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Messages: delete own"       ON public.trip_messages FOR DELETE TO authenticated USING (auth.uid() = author_id);

DROP TRIGGER IF EXISTS update_trip_messages_updated_at ON public.trip_messages;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER update_trip_messages_updated_at
  BEFORE UPDATE ON public.trip_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CHAT: REACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_message_reactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES public.trip_messages(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type varchar(20) NOT NULL CHECK (reaction_type IN ('like','love','laugh','wow','sad','angry','thumbs_up','thumbs_down','fire','party')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

CREATE INDEX idx_trip_message_reactions_message_id ON public.trip_message_reactions(message_id);

ALTER TABLE public.trip_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions: select if member"
  ON public.trip_message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_messages tm JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tm.id = message_id AND tmem.profile_id = auth.uid()));

CREATE POLICY "Reactions: manage own"
  ON public.trip_message_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trip_messages tm JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tm.id = message_id AND tmem.profile_id = auth.uid()));

-- ============================================================
-- CHAT: POLLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_polls (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.trip_messages(id) ON DELETE CASCADE,
  question   text NOT NULL,
  poll_type  varchar(20) NOT NULL DEFAULT 'multiple_choice' CHECK (poll_type IN ('multiple_choice','yes_no','rating')),
  options    jsonb NOT NULL DEFAULT '[]',
  settings   jsonb NOT NULL DEFAULT '{"multiple_votes": false, "anonymous": false}',
  expires_at timestamptz,
  is_closed  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_polls_message_id ON public.trip_polls(message_id);

ALTER TABLE public.trip_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls: select if member"
  ON public.trip_polls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_messages tm JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tm.id = message_id AND tmem.profile_id = auth.uid()));

CREATE POLICY "Polls: create if message author"
  ON public.trip_polls FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trip_messages tm JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tm.id = message_id AND tmem.profile_id = auth.uid() AND tm.author_id = auth.uid()));

-- ============================================================
-- CHAT: POLL VOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid NOT NULL REFERENCES public.trip_polls(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  rating       integer CHECK (rating >= 1 AND rating <= 5),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

CREATE INDEX idx_trip_poll_votes_poll_id ON public.trip_poll_votes(poll_id);

ALTER TABLE public.trip_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PollVotes: select if member"
  ON public.trip_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_polls tp JOIN public.trip_messages tm ON tp.message_id = tm.id JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tp.id = poll_id AND tmem.profile_id = auth.uid()));

CREATE POLICY "PollVotes: manage own"
  ON public.trip_poll_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trip_polls tp JOIN public.trip_messages tm ON tp.message_id = tm.id JOIN public.trip_members tmem ON tm.trip_id = tmem.trip_id WHERE tp.id = poll_id AND tmem.profile_id = auth.uid()));

-- ============================================================
-- CHAT: TYPING INDICATORS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trip_typing_indicators (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing     boolean NOT NULL DEFAULT true,
  last_activity timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

CREATE INDEX idx_trip_typing_indicators_trip_id ON public.trip_typing_indicators(trip_id);

ALTER TABLE public.trip_typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Typing: select if member"
  ON public.trip_typing_indicators FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_typing_indicators.trip_id AND profile_id = auth.uid()));

CREATE POLICY "Typing: manage own"
  ON public.trip_typing_indicators FOR ALL TO authenticated
  USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip_typing_indicators.trip_id AND profile_id = auth.uid()));

-- ============================================================
-- CHAT UTILITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_typing_indicator(p_trip_id uuid, p_is_typing boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.trip_typing_indicators (trip_id, user_id, is_typing, last_activity)
  VALUES (p_trip_id, auth.uid(), p_is_typing, NOW())
  ON CONFLICT (trip_id, user_id)
  DO UPDATE SET is_typing = p_is_typing, last_activity = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.trip_typing_indicators WHERE last_activity < NOW() - INTERVAL '30 seconds';
END;
$$;

-- ============================================================
-- ANALYTICS / HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_trip_dietary_preferences(trip_id_param uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  dietary_prefs jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(DISTINCT dietary_pref), '[]'::jsonb) INTO dietary_prefs
  FROM (
    SELECT jsonb_array_elements_text(p.dietary_preferences) as dietary_pref
    FROM public.trip_members tm
    JOIN public.profiles p ON tm.profile_id = p.id
    WHERE tm.trip_id = trip_id_param
      AND p.dietary_preferences IS NOT NULL
      AND jsonb_array_length(p.dietary_preferences) > 0
  ) AS all_prefs;
  RETURN dietary_prefs;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trip_member_interests(trip_id_param uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('id', 'traveler_' || ROW_NUMBER() OVER(), 'interests', p.interests)),
      '[]'::jsonb
    )
    FROM public.trip_members tm
    JOIN public.profiles p ON tm.profile_id = p.id
    WHERE tm.trip_id = trip_id_param
      AND p.interests IS NOT NULL
      AND jsonb_array_length(p.interests) > 0
  );
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

ALTER TABLE public.trips                  REPLICA IDENTITY FULL;
ALTER TABLE public.trip_members           REPLICA IDENTITY FULL;
ALTER TABLE public.bookings               REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_items        REPLICA IDENTITY FULL;
ALTER TABLE public.expenses               REPLICA IDENTITY FULL;
ALTER TABLE public.expense_participants   REPLICA IDENTITY FULL;
ALTER TABLE public.payment_records        REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_typing_indicators;
