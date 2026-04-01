
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enums
create type public.trip_member_role as enum ('owner','editor','viewer');
create type public.trip_visibility as enum ('private','link','public');
create type public.booking_type as enum ('flight','hotel','car','activity','other');
create type public.itinerary_item_type as enum ('flight','lodging','transport','food','activity','note','other');
create type public.invitation_status as enum ('pending','accepted','declined','expired');

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (mirror of auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: select own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Profiles: update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Profiles: insert self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-insert profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url, preferences)
  values (new.id, null, null, null, '{}'::jsonb);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  description text,
  start_date date,
  end_date date,
  visibility public.trip_visibility not null default 'private',
  destination_main text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

-- Trip members
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.trip_member_role not null default 'viewer',
  invitation_status public.invitation_status not null default 'accepted',
  added_at timestamptz not null default now(),
  unique(trip_id, profile_id)
);

create index if not exists idx_trip_members_trip on public.trip_members(trip_id);
create index if not exists idx_trip_members_profile on public.trip_members(profile_id);

alter table public.trip_members enable row level security;

-- Membership helpers
create or replace function public.is_trip_member(_user_id uuid, _trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = _trip_id
      and tm.profile_id = _user_id
      and tm.invitation_status = 'accepted'
  );
$$;

create or replace function public.has_trip_role(_user_id uuid, _trip_id uuid, roles public.trip_member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = _trip_id
      and tm.profile_id = _user_id
      and tm.role = any(roles)
      and tm.invitation_status = 'accepted'
  );
$$;

create or replace function public.is_trip_owner(_user_id uuid, _trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_trip_role(_user_id, _trip_id, array['owner']::public.trip_member_role[]);
$$;

-- Trips RLS
create policy "Trips: select if member"
on public.trips
for select
to authenticated
using (public.is_trip_member(auth.uid(), id));

create policy "Trips: insert when creator is user"
on public.trips
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Trips: update if editor or owner"
on public.trips
for update
to authenticated
using (public.has_trip_role(auth.uid(), id, array['owner','editor']::public.trip_member_role[]))
with check (public.has_trip_role(auth.uid(), id, array['owner','editor']::public.trip_member_role[]));

create policy "Trips: delete if owner"
on public.trips
for delete
to authenticated
using (public.is_trip_owner(auth.uid(), id));

-- Trip members RLS
create policy "TripMembers: select if member"
on public.trip_members
for select
to authenticated
using (public.is_trip_member(auth.uid(), trip_id));

create policy "TripMembers: insert owner only"
on public.trip_members
for insert
to authenticated
with check (public.is_trip_owner(auth.uid(), trip_id));

create policy "TripMembers: update owner only"
on public.trip_members
for update
to authenticated
using (public.is_trip_owner(auth.uid(), trip_id))
with check (public.is_trip_owner(auth.uid(), trip_id));

create policy "TripMembers: delete owner or self-leave"
on public.trip_members
for delete
to authenticated
using (public.is_trip_owner(auth.uid(), trip_id) or profile_id = auth.uid());

-- Trip validation + owner membership
create or replace function public.validate_trip_dates()
returns trigger
language plpgsql
as $$
begin
  if new.start_date is not null and new.end_date is not null and new.end_date < new.start_date then
    raise exception 'end_date (%) cannot be before start_date (%)', new.end_date, new.start_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

drop trigger if exists trips_validate_dates on public.trips;
create trigger trips_validate_dates
before insert or update on public.trips
for each row execute function public.validate_trip_dates();

create or replace function public.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members(trip_id, profile_id, role, invitation_status)
  values (new.id, new.created_by, 'owner', 'accepted')
  on conflict (trip_id, profile_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trips_add_owner_membership on public.trips;
create trigger trips_add_owner_membership
after insert on public.trips
for each row execute procedure public.add_owner_membership();

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  type public.booking_type not null,
  provider text,
  confirmation_code text,
  start_time timestamptz,
  end_time timestamptz,
  price numeric(12,2),
  currency char(3),
  details jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Bookings: select if member"
on public.bookings
for select
to authenticated
using (public.is_trip_member(auth.uid(), trip_id));

create policy "Bookings: insert if editor or owner"
on public.bookings
for insert
to authenticated
with check (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]));

create policy "Bookings: update if editor or owner"
on public.bookings
for update
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]))
with check (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]));

create policy "Bookings: delete if editor or owner"
on public.bookings
for delete
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]));

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.validate_time_range()
returns trigger
language plpgsql
as $$
begin
  if new.start_time is not null and new.end_time is not null and new.end_time < new.start_time then
    raise exception 'end_time (%) cannot be before start_time (%)', new.end_time, new.start_time;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_validate_times on public.bookings;
create trigger bookings_validate_times
before insert or update on public.bookings
for each row execute function public.validate_time_range();

-- Itinerary items
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  type public.itinerary_item_type not null default 'activity',
  title text not null,
  notes text,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  start_time timestamptz,
  end_time timestamptz,
  all_day boolean not null default false,
  order_index integer,
  booking_id uuid references public.bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_itinerary_trip_time on public.itinerary_items(trip_id, start_time);
alter table public.itinerary_items enable row level security;

create policy "Itinerary: select if member"
on public.itinerary_items
for select
to authenticated
using (public.is_trip_member(auth.uid(), trip_id));

create policy "Itinerary: insert if editor or owner"
on public.itinerary_items
for insert
to authenticated
with check (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]));

create policy "Itinerary: update if editor/owner or creator"
on public.itinerary_items
for update
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or created_by = auth.uid())
with check (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or created_by = auth.uid());

create policy "Itinerary: delete if editor/owner or creator"
on public.itinerary_items
for delete
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or created_by = auth.uid());

drop trigger if exists itinerary_set_updated_at on public.itinerary_items;
create trigger itinerary_set_updated_at
before update on public.itinerary_items
for each row execute function public.set_updated_at();

drop trigger if exists itinerary_validate_times on public.itinerary_items;
create trigger itinerary_validate_times
before insert or update on public.itinerary_items
for each row execute function public.validate_time_range();

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  description text,
  amount numeric(12,2) not null,
  currency char(3) not null default 'USD',
  paid_by uuid not null references public.profiles(id) on delete restrict,
  incurred_on date not null default (now()::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "Expenses: select if member"
on public.expenses
for select
to authenticated
using (public.is_trip_member(auth.uid(), trip_id));

create policy "Expenses: insert if member"
on public.expenses
for insert
to authenticated
with check (public.is_trip_member(auth.uid(), trip_id) and paid_by = auth.uid());

create policy "Expenses: update if editor/owner or payer"
on public.expenses
for update
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or paid_by = auth.uid())
with check (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or paid_by = auth.uid());

create policy "Expenses: delete if editor/owner or payer"
on public.expenses
for delete
to authenticated
using (public.has_trip_role(auth.uid(), trip_id, array['owner','editor']::public.trip_member_role[]) or paid_by = auth.uid());

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- Expense participants
create table if not exists public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12,2),
  unique(expense_id, profile_id)
);

alter table public.expense_participants enable row level security;

create policy "ExpenseParticipants: select if member"
on public.expense_participants
for select
to authenticated
using (exists (
  select 1 from public.expenses e
  where e.id = expense_id and public.is_trip_member(auth.uid(), e.trip_id)
));

create policy "ExpenseParticipants: write if editor/owner or payer"
on public.expense_participants
for insert
to authenticated
with check (exists (
  select 1 from public.expenses e
  where e.id = expense_id and (
    public.has_trip_role(auth.uid(), e.trip_id, array['owner','editor']::public.trip_member_role[]) or e.paid_by = auth.uid()
  )
));

create policy "ExpenseParticipants: update if editor/owner or payer"
on public.expense_participants
for update
to authenticated
using (exists (
  select 1 from public.expenses e
  where e.id = expense_id and (
    public.has_trip_role(auth.uid(), e.trip_id, array['owner','editor']::public.trip_member_role[]) or e.paid_by = auth.uid()
  )
))
with check (exists (
  select 1 from public.expenses e
  where e.id = expense_id and (
    public.has_trip_role(auth.uid(), e.trip_id, array['owner','editor']::public.trip_member_role[]) or e.paid_by = auth.uid()
  )
));

create policy "ExpenseParticipants: delete if editor/owner or payer"
on public.expense_participants
for delete
to authenticated
using (exists (
  select 1 from public.expenses e
  where e.id = expense_id and (
    public.has_trip_role(auth.uid(), e.trip_id, array['owner','editor']::public.trip_member_role[]) or e.paid_by = auth.uid()
  )
));

-- Realtime-friendly updates
alter table public.trips replica identity full;
alter table public.trip_members replica identity full;
alter table public.bookings replica identity full;
alter table public.itinerary_items replica identity full;
alter table public.expenses replica identity full;
alter table public.expense_participants replica identity full;
