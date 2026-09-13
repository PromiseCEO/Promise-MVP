-- ============================================================
-- Promise — Phase 1: age gate, email-verification gate,
-- progress check-in safety/privacy fix, Self Promise versioning.
-- Additive only — safe to run against a database with existing users.
-- Run in Supabase Studio > SQL editor (or `supabase db push`)
-- after schema.sql and 002_relationship_journey.sql
-- ============================================================

-- ---------------------------------------------------------------
-- 1. Age gate: date_of_birth on profiles + a hard under-18 block
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists date_of_birth date;

create or replace function public.enforce_min_age()
returns trigger
language plpgsql
as $$
begin
  if new.date_of_birth is not null and new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be at least 18 years old to use Promise.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_min_age on public.profiles;
create trigger profiles_min_age
  before insert or update of date_of_birth on public.profiles
  for each row execute procedure public.enforce_min_age();

-- Pick up date_of_birth from signup metadata (options.data.date_of_birth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, identity, date_of_birth)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'identity', ''),
    nullif(new.raw_user_meta_data->>'date_of_birth', '')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 2. Server-side helpers: is the current user email-verified /
-- an adult? Used to gate matching/messaging server-side, not just
-- hidden client-side.
-- ---------------------------------------------------------------
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer set search_path = public, auth
as $$
  select coalesce(
    (select email_confirmed_at is not null from auth.users where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_adult()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select date_of_birth is not null and date_of_birth <= (current_date - interval '18 years')::date
     from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------
-- 3. Gate matching (likes) and the dating-promise RPCs on
-- email verification (+ adult check where a new match/couple forms)
-- ---------------------------------------------------------------
drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own" on public.likes for insert
  with check (auth.uid() = user_id and public.is_email_verified() and public.is_adult());

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
  if not public.is_email_verified() then raise exception 'Verify your email before proposing a Dating Promise.'; end if;
  if not public.is_adult() then raise exception 'You must be 18 or older.'; end if;
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

create or replace function public.sign_dating_promise(cid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid;
begin
  if not public.is_email_verified() then raise exception 'Verify your email before signing a Dating Promise.'; end if;
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
  if not public.is_email_verified() then raise exception 'Verify your email before linking with a partner.'; end if;

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
-- 4. progress_checkins: safety-flag column + real "both must
-- submit" gating. Previously "progress_checkins_member_all" let
-- either partner read the other's answers immediately, with no
-- gating and no way to keep a safety concern private — fixing both.
-- ---------------------------------------------------------------
alter table public.progress_checkins add column if not exists flagged_safety_concern boolean default false;

drop policy if exists "progress_checkins_member_all" on public.progress_checkins;

-- Owner can always read/write their own rows (including flagged ones)
create policy "progress_checkins_owner_all" on public.progress_checkins for all
  using (auth.uid() = user_id and public.is_couple_member(couple_id))
  with check (auth.uid() = user_id and public.is_couple_member(couple_id));

-- The other partner can read a row only once they've submitted at
-- least one check-in of their own for this couple, and never a
-- row flagged as a safety concern.
create policy "progress_checkins_partner_read_after_mutual_submit" on public.progress_checkins for select
  using (
    public.is_couple_member(couple_id)
    and auth.uid() <> user_id
    and flagged_safety_concern = false
    and exists (
      select 1 from public.progress_checkins mine
      where mine.couple_id = progress_checkins.couple_id and mine.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 5. self_promises: version, don't overwrite. Existing rows become
-- version 1; new saves insert version N+1 instead of upserting in place.
-- ---------------------------------------------------------------
alter table public.self_promises add column if not exists id uuid default gen_random_uuid();
alter table public.self_promises add column if not exists version int default 1;
update public.self_promises set id = gen_random_uuid() where id is null;
alter table public.self_promises alter column id set not null;

alter table public.self_promises drop constraint if exists self_promises_pkey;
alter table public.self_promises add primary key (id);
alter table public.self_promises add constraint self_promises_user_version_key unique (user_id, version);

-- self_promises_owner (auth.uid() = user_id) already covers all ops; unaffected by the PK change.
