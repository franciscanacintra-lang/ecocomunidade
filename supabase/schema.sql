create table if not exists public.appliances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  watts numeric(10,2) not null check (watts > 0),
  hours_daily numeric(5,2) not null check (hours_daily > 0 and hours_daily <= 24),
  days_month smallint not null check (days_month between 1 and 31),
  tariff numeric(8,4) not null check (tariff >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.water_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reading_date date not null,
  value_m3 numeric(12,3) not null check (value_m3 >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, reading_date)
);

create table if not exists public.water_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  liters_per_event numeric(12,2) not null check (liters_per_event > 0),
  events_per_week numeric(8,2) not null check (events_per_week > 0),
  tariff numeric(8,4) not null check (tariff >= 0),
  start_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.community_tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 400),
  created_at timestamptz not null default now()
);

alter table public.appliances enable row level security;
alter table public.water_readings enable row level security;
alter table public.water_activities enable row level security;
alter table public.community_tips enable row level security;

drop policy if exists "Users manage their appliances" on public.appliances;
create policy "Users manage their appliances" on public.appliances
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their water readings" on public.water_readings;
create policy "Users manage their water readings" on public.water_readings
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their water activities" on public.water_activities;
create policy "Users manage their water activities" on public.water_activities
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Community tips are visible to signed-in users" on public.community_tips;
create policy "Community tips are visible to signed-in users" on public.community_tips
  for select to authenticated using (true);

drop policy if exists "Signed-in users publish their own tips" on public.community_tips;
create policy "Signed-in users publish their own tips" on public.community_tips
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Authors delete their own tips" on public.community_tips;
create policy "Authors delete their own tips" on public.community_tips
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists appliances_user_created_idx on public.appliances (user_id, created_at desc);
create index if not exists water_readings_user_date_idx on public.water_readings (user_id, reading_date desc);
create index if not exists water_activities_user_created_idx on public.water_activities (user_id, created_at desc);
create index if not exists community_tips_created_idx on public.community_tips (created_at desc);