-- Migration: Add trip_recommendations table and update itinerary_generation_jobs status enum

-- 1. Create trip_recommendations table
create table if not exists trip_recommendations (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade not null,
  user_id     uuid references profiles(id) on delete cascade not null,
  destination text not null,
  text        text not null,
  created_at  timestamptz default now() not null
);

create index if not exists trip_recommendations_trip_id_idx on trip_recommendations(trip_id);
create index if not exists trip_recommendations_user_id_idx on trip_recommendations(user_id);
create index if not exists trip_recommendations_destination_idx on trip_recommendations(destination);

alter table trip_recommendations enable row level security;

-- Members can read recommendations for trips they belong to
create policy "trip members can read recommendations"
  on trip_recommendations for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trip_recommendations.trip_id
        and trip_members.profile_id = auth.uid()
        and trip_members.invitation_status = 'accepted'
    )
  );

-- Users can insert their own recommendations
create policy "users can insert own recommendations"
  on trip_recommendations for insert
  with check (user_id = auth.uid());

-- 2. Update itinerary_generation_jobs status constraint to allow streaming and cancelled
alter table itinerary_generation_jobs
  drop constraint if exists itinerary_generation_jobs_status_check;

alter table itinerary_generation_jobs
  add constraint itinerary_generation_jobs_status_check
  check (status in ('pending', 'streaming', 'processing', 'completed', 'failed', 'cancelled', 'cleared'));
