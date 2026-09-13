-- ============================================================
-- Promise — Relationship Journey migration
-- Adds: Singles matching (likes), Couples linking, and the
-- Dating Promise -> Progress Check-ins -> Engagement Promise ->
-- Marriage Promise progression.
-- Run in Supabase Studio > SQL editor (or `supabase db push`)
-- after schema.sql
-- ============================================================

-- ---------------------------------------------------------------
-- likes: one Single expressing interest in another
-- A mutual like (both directions exist) = a "match"
-- ---------------------------------------------------------------
create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, target_user_id),
  check (user_id <> target_user_id)
);

-- ---------------------------------------------------------------
-- couples: the shared relationship record. Created either when
-- two matched Singles both sign a Dating Promise, or immediately
-- when two Couples-Journey partners link accounts.
-- ---------------------------------------------------------------
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a uuid references public.profiles(id) on delete cascade,
  user_b uuid references public.profiles(id) on delete cascade,
  source text not null default 'dating', -- 'dating' (came from Singles matching) | 'couples_journey' (linked directly)
  stage text not null default 'dating',  -- 'dating' | 'engaged' | 'married'
  created_at timestamptz default now(),
  check (user_a <> user_b)
);
-- a user should only be in one active couple at a time
create unique index if not exists couples_user_a_unique on public.couples(user_a);
create unique index if not exists couples_user_b_unique on public.couples(user_b);

-- ---------------------------------------------------------------
-- couple_invites: lets a Couples-Journey user invite their partner
-- by a short code, so both accounts can link into one `couples` row.
-- ---------------------------------------------------------------
create table if not exists public.couple_invites (
  code text primary key,
  created_by uuid references public.profiles(id) on delete cascade,
  used boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- dating_promises: proposed by one matched Single, accepted/signed
-- by the other. Once both have signed, the couple's stage stays
-- 'dating' and progress check-ins can begin.
-- ---------------------------------------------------------------
create table if not exists public.dating_promises (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  html text,
  commitments jsonb default '[]'::jsonb,
  proposed_by uuid references public.profiles(id),
  signed_a boolean default false,
  signed_b boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- progress_checkins: periodic, independent reflections each partner
-- fills out during the Dating / Realignment stage. Used to gate
-- eligibility for the Engagement Promise.
-- ---------------------------------------------------------------
create table if not exists public.progress_checkins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references public.couples(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  answers jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- engagement_promises: unlocked after consistent dating + enough
-- check-ins. Richer than the Dating Promise — includes wedding
-- planning fields.
-- ---------------------------------------------------------------
create table if not exists public.engagement_promises (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  html text,
  commitments jsonb default '[]'::jsonb,
  wedding_target_date text,
  venue_type text,
  budget_notes text,
  family_involvement text,
  signed_a boolean default false,
  signed_b boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- marriage_promises: the final keepsake. Combines the Self Promise
-- of each partner + the Dating/Realignment Promise + the Engagement
-- Promise into one document, plus new long-term commitment goals.
-- ---------------------------------------------------------------
create table if not exists public.marriage_promises (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  html text,
  long_term_goals jsonb default '[]'::jsonb,
  signed_a boolean default false,
  signed_b boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.likes enable row level security;
alter table public.couples enable row level security;
alter table public.couple_invites enable row level security;
alter table public.dating_promises enable row level security;
alter table public.progress_checkins enable row level security;
alter table public.engagement_promises enable row level security;
alter table public.marriage_promises enable row level security;

-- likes: you can create/see your own outgoing likes, and see likes
-- directed at you (needed to detect a mutual match)
create policy "likes_insert_own" on public.likes for insert
  with check (auth.uid() = user_id);
create policy "likes_select_own_or_incoming" on public.likes for select
  using (auth.uid() = user_id or auth.uid() = target_user_id);
create policy "likes_delete_own" on public.likes for delete
  using (auth.uid() = user_id);

-- couples: either member can read; creation is done via the
-- propose-dating-promise / accept-couple-invite RPCs below (security
-- definer) so app code never inserts into `couples` directly.
create policy "couples_select_member" on public.couples for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- couple_invites: creator can manage their own invite code
create policy "couple_invites_owner" on public.couple_invites for all
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
-- anyone signed in can look up an invite by code to redeem it
create policy "couple_invites_select_any" on public.couple_invites for select
  using (auth.role() = 'authenticated');

-- helper: is the current user part of this couple_id?
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.couples
    where id = cid and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;

create policy "dating_promises_member" on public.dating_promises for all
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "progress_checkins_member_all" on public.progress_checkins for all
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "engagement_promises_member" on public.engagement_promises for all
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

create policy "marriage_promises_member" on public.marriage_promises for all
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));

-- ---------------------------------------------------------------
-- RPC: propose_dating_promise
-- Called when a Single proposes a Dating Promise to a mutual match.
-- Creates the couple row (if it doesn't exist yet) and the
-- dating_promises row, atomically, bypassing the "no direct insert
-- into couples" restriction safely via SECURITY DEFINER.
-- ---------------------------------------------------------------
create or replace function public.propose_dating_promise(
  target_id uuid, promise_html text, promise_commitments jsonb
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  mutual boolean;
  cid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if me = target_id then raise exception 'Cannot match with yourself'; end if;

  select exists (
    select 1 from public.likes where user_id = me and target_user_id = target_id
  ) and exists (
    select 1 from public.likes where user_id = target_id and target_user_id = me
  ) into mutual;

  if not mutual then
    raise exception 'You can only propose a Dating Promise to a mutual match.';
  end if;

  select id into cid from public.couples
    where (user_a = me and user_b = target_id) or (user_a = target_id and user_b = me);

  if cid is null then
    insert into public.couples (user_a, user_b, source, stage)
    values (me, target_id, 'dating', 'dating')
    returning id into cid;
  end if;

  insert into public.dating_promises (couple_id, html, commitments, proposed_by, signed_a)
  values (cid, promise_html, promise_commitments, me, true)
  on conflict (couple_id) do update
    set html = excluded.html, commitments = excluded.commitments, updated_at = now();

  return cid;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: sign_dating_promise — the other partner accepts/signs
-- ---------------------------------------------------------------
create or replace function public.sign_dating_promise(cid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid;
begin
  select user_a, user_b into a, b from public.couples where id = cid;
  if me is null or (me <> a and me <> b) then
    raise exception 'Not a member of this couple';
  end if;
  if me = a then
    update public.dating_promises set signed_a = true, updated_at = now() where couple_id = cid;
  else
    update public.dating_promises set signed_b = true, updated_at = now() where couple_id = cid;
  end if;
end;
$$;

-- ---------------------------------------------------------------
-- RPC: redeem_couple_invite — links two Couples-Journey accounts
-- ---------------------------------------------------------------
create or replace function public.redeem_couple_invite(invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  inviter uuid;
  cid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;

  select created_by into inviter from public.couple_invites
    where code = invite_code and used = false;

  if inviter is null then raise exception 'Invalid or already-used invite code'; end if;
  if inviter = me then raise exception 'Cannot redeem your own invite'; end if;

  insert into public.couples (user_a, user_b, source, stage)
  values (inviter, me, 'couples_journey', 'dating')
  returning id into cid;

  update public.couple_invites set used = true where code = invite_code;

  return cid;
end;
$$;

-- ---------------------------------------------------------------
-- Stage-gating constants are enforced in the app / edge function,
-- not the DB, so they're easy to tune:
--   MIN_CHECKINS_PER_PARTNER_FOR_ENGAGEMENT = 3
-- ---------------------------------------------------------------
