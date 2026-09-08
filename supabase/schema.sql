-- ============================================================
-- Promise — Supabase schema
-- Run this in Supabase Studio > SQL editor (or `supabase db push`)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- profiles: one row per auth.users, created automatically on signup
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  identity text,                 -- Woman / Man / Nonbinary / Prefer not to say
  journey text default 'singles', -- singles | couples
  plan text default 'singles',
  family_addon boolean default false,
  subscription_status text default 'inactive', -- inactive | active | past_due | canceled
  stripe_customer_id text,
  intentional jsonb default '{}'::jsonb, -- city, age, occupation, education, values, etc.
  ladies_message_free boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.self_promises (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  html text,
  commitments jsonb default '[]'::jsonb,
  date_yourself text,
  promise_date date,
  updated_at timestamptz default now()
);

create table if not exists public.couple_self_promises (
  user_id uuid references public.profiles(id) on delete cascade,
  partner_num int check (partner_num in (1,2)),
  name text,
  narrative text,
  commitments jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, partner_num)
);

create table if not exists public.realignment_answers (
  user_id uuid references public.profiles(id) on delete cascade,
  partner_num int check (partner_num in (1,2)),
  answers jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  primary key (user_id, partner_num)
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  age text,
  relationship text,
  grade text,
  expectations jsonb default '[]'::jsonb,
  narrative text,
  promise_text text,
  created_at timestamptz default now()
);

create table if not exists public.household_promises (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  body text,
  names jsonb default '[]'::jsonb,
  narrative text,
  updated_at timestamptz default now()
);

create table if not exists public.wall_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('photo','promise')),
  title text,
  journey text,
  caption text,
  text text,               -- for type='promise'
  photo_path text,         -- storage path for type='photo'
  visibility text default 'private', -- private | community | public
  created_at timestamptz default now()
);

create table if not exists public.couples_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  couple_name text default 'Our Couple',
  avatar text default '🤝',
  milestone text,
  goal text,
  target text,
  celebrations int default 0,
  visibility text default 'public', -- public | private
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  thread_key text not null,
  from_me boolean default true,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,               -- singles | couples (+ family add-on flag lives on profiles)
  status text,              -- trialing | active | past_due | canceled | incomplete
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Auto-create a profile row whenever someone signs up
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, identity)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'identity', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.self_promises enable row level security;
alter table public.couple_self_promises enable row level security;
alter table public.realignment_answers enable row level security;
alter table public.family_members enable row level security;
alter table public.household_promises enable row level security;
alter table public.wall_items enable row level security;
alter table public.couples_goals enable row level security;
alter table public.messages enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: read/update only your own row
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- generic "owner can do everything" policy, repeated per table
create policy "self_promises_owner" on public.self_promises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "couple_self_promises_owner" on public.couple_self_promises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "realignment_owner" on public.realignment_answers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "family_members_owner" on public.family_members for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "household_promises_owner" on public.household_promises for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "wall_items_owner" on public.wall_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- allow reading other people's public/community wall items too
create policy "wall_items_public_read" on public.wall_items for select
  using (visibility in ('public','community'));

create policy "couples_goals_owner" on public.couples_goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- allow reading everyone's public goal posts (the Couples Goals Wall feed)
create policy "couples_goals_public_read" on public.couples_goals for select
  using (visibility = 'public');

create policy "messages_owner" on public.messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions_owner_read" on public.subscriptions for select
  using (auth.uid() = user_id);
-- subscriptions are written only by the Stripe webhook Edge Function
-- (using the service_role key, which bypasses RLS) — no insert/update policy
-- is granted to regular users on purpose.

-- ---------------------------------------------------------------
-- Storage buckets (run once; safe to re-run)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('wall-photos', 'wall-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Users may only upload into a folder named after their own user id
create policy "wall_photos_owner_write" on storage.objects for insert
  with check (bucket_id = 'wall-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "wall_photos_public_read" on storage.objects for select
  using (bucket_id = 'wall-photos');

create policy "profile_photos_owner_write" on storage.objects for insert
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_photos_public_read" on storage.objects for select
  using (bucket_id = 'profile-photos');
