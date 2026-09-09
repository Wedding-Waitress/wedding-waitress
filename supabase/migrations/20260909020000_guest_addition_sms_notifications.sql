-- Optional platform-paid organiser SMS alerts. Existing notifications are set
-- to not_requested so enabling SMS can never back-send historical additions.

alter table public.guest_addition_notification_preferences
  add column if not exists sms_enabled boolean not null default false;

create table if not exists public.organiser_phone_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organiser_phone_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  code_hash text not null,
  request_fingerprint text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  provider_id text,
  created_at timestamptz not null default now()
);

create index if not exists organiser_phone_otp_user_created_idx
  on public.organiser_phone_otp_challenges(user_id, created_at desc);
create index if not exists organiser_phone_otp_fingerprint_created_idx
  on public.organiser_phone_otp_challenges(request_fingerprint, created_at desc);

alter table public.organiser_phone_verifications enable row level security;
alter table public.organiser_phone_otp_challenges enable row level security;
revoke all on public.organiser_phone_verifications from public, anon, authenticated;
revoke all on public.organiser_phone_otp_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.organiser_phone_verifications to service_role;
grant select, insert, update, delete on public.organiser_phone_otp_challenges to service_role;

create or replace function public.reserve_organiser_phone_otp_challenge(
  _user_id uuid,
  _event_id uuid,
  _phone_e164 text,
  _code_hash text,
  _request_fingerprint text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare challenge_id uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Not authorised'; end if;
  if _phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone'; end if;
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(_request_fingerprint, 1));
  if (select count(*) from public.organiser_phone_otp_challenges
       where user_id = _user_id and created_at >= now() - interval '1 hour') >= 5
     or (select count(*) from public.organiser_phone_otp_challenges
       where request_fingerprint = _request_fingerprint and created_at >= now() - interval '1 hour') >= 10 then
    raise exception 'rate_limit_exceeded';
  end if;
  if exists (select 1 from public.organiser_phone_otp_challenges
      where user_id = _user_id and created_at >= now() - interval '1 minute') then
    raise exception 'rate_limit_wait';
  end if;
  update public.organiser_phone_otp_challenges
     set consumed_at = coalesce(consumed_at, now())
   where user_id = _user_id and consumed_at is null;
  insert into public.organiser_phone_otp_challenges(
    user_id, event_id, phone_e164, code_hash, request_fingerprint, expires_at
  ) values (
    _user_id, _event_id, _phone_e164, _code_hash, _request_fingerprint, now() + interval '10 minutes'
  ) returning id into challenge_id;
  return challenge_id;
end;
$$;
revoke all on function public.reserve_organiser_phone_otp_challenge(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.reserve_organiser_phone_otp_challenge(uuid, uuid, text, text, text)
  to service_role;

create or replace function public.invalidate_organiser_phone_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.mobile is distinct from new.mobile then
    delete from public.organiser_phone_verifications where user_id = new.id;
    update public.guest_addition_notification_preferences p
       set sms_enabled = false, updated_at = now()
      from public.events e
     where e.id = p.event_id and e.user_id = new.id and p.sms_enabled = true;
    update public.organiser_phone_otp_challenges
       set consumed_at = coalesce(consumed_at, now())
     where user_id = new.id and consumed_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_organiser_phone_verification() from public, anon, authenticated;

drop trigger if exists profiles_invalidate_organiser_phone_verification on public.profiles;
create trigger profiles_invalidate_organiser_phone_verification
after update of mobile on public.profiles
for each row execute function public.invalidate_organiser_phone_verification();

alter table public.guest_addition_notifications
  add column if not exists sms_status text not null default 'not_requested'
    check (sms_status in ('pending', 'processing', 'queued', 'failed', 'disabled', 'not_requested')),
  add column if not exists sms_claimed_at timestamptz,
  add column if not exists sms_queued_at timestamptz,
  add column if not exists sms_provider text,
  add column if not exists sms_provider_id text,
  add column if not exists sms_error text;

create index if not exists guest_addition_notifications_sms_idx
  on public.guest_addition_notifications(sms_status, created_at)
  where sms_status = 'pending';

create or replace function public.capture_guest_addition_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  added_guest public.guests%rowtype;
  referrer public.guests%rowtype;
  referrer_id uuid;
  choice text;
  wants_email boolean;
  wants_sms boolean;
begin
  if new.changed_by is distinct from 'public_live_view'
     or new.payload->>'action' is distinct from 'add_guest' then return new; end if;
  select * into added_guest from public.guests where id = new.guest_id and event_id = new.event_id;
  referrer_id := added_guest.added_by_guest_id;
  select * into referrer from public.guests where id = referrer_id and event_id = new.event_id;
  choice := new.payload->>'group_choice';
  if added_guest.id is null or referrer.id is null or choice is null
     or choice not in ('separate', 'group') then return new; end if;
  select coalesce(p.email_enabled, false), coalesce(p.sms_enabled, false)
    into wants_email, wants_sms
    from public.guest_addition_notification_preferences p where p.event_id = new.event_id;
  wants_email := coalesce(wants_email, false);
  wants_sms := coalesce(wants_sms, false);
  insert into public.guest_addition_notifications(
    event_id, guest_id, added_by_guest_id, update_log_id, group_choice,
    added_guest_name, added_by_name, email_status, sms_status, created_at
  ) values (
    new.event_id, new.guest_id, referrer.id, new.id, choice,
    btrim(added_guest.first_name || ' ' || added_guest.last_name),
    btrim(referrer.first_name || ' ' || referrer.last_name),
    case when wants_email then 'pending' else 'disabled' end,
    case when wants_sms then 'pending' else 'disabled' end,
    new.created_at
  ) on conflict (event_id, guest_id) do nothing;
  return new;
end;
$$;
revoke all on function public.capture_guest_addition_notification() from public, anon, authenticated;

create or replace function public.get_guest_addition_sms_eligibility(_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare owner_id uuid;
begin
  if (select auth.uid()) is null or not public.can_access_event((select auth.uid()), _event_id) then
    raise exception 'Not authorised';
  end if;
  select e.user_id into owner_id from public.events e where e.id = _event_id;
  return exists (select 1 from public.organiser_phone_verifications v where v.user_id = owner_id);
end;
$$;
revoke all on function public.get_guest_addition_sms_eligibility(uuid) from public, anon;
grant execute on function public.get_guest_addition_sms_eligibility(uuid) to authenticated;

create or replace function public.set_guest_addition_sms_preference(_event_id uuid, _enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or not public.can_access_event((select auth.uid()), _event_id) then
    raise exception 'Not authorised';
  end if;
  if coalesce(_enabled, false) and not public.get_guest_addition_sms_eligibility(_event_id) then
    raise exception 'The event owner does not have a verified account mobile';
  end if;
  insert into public.guest_addition_notification_preferences(event_id, sms_enabled, updated_at)
  values (_event_id, coalesce(_enabled, false), now())
  on conflict (event_id) do update set sms_enabled = excluded.sms_enabled, updated_at = now();
  return true;
end;
$$;
revoke all on function public.set_guest_addition_sms_preference(uuid, boolean) from public, anon;
grant execute on function public.set_guest_addition_sms_preference(uuid, boolean) to authenticated;

create or replace function public.claim_guest_addition_sms_notifications(_limit integer default 50)
returns setof public.guest_addition_notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.guest_addition_notifications n
     set sms_status = 'disabled', sms_error = null
   where n.sms_status = 'pending'
     and not exists (
       select 1 from public.guest_addition_notification_preferences p
        where p.event_id = n.event_id and p.sms_enabled = true
     );
  return query
  with candidates as (
    select n.id
      from public.guest_addition_notifications n
      join public.guest_addition_notification_preferences p
        on p.event_id = n.event_id and p.sms_enabled = true
      join public.events e on e.id = n.event_id
      join public.organiser_phone_verifications v on v.user_id = e.user_id
     where n.sms_status = 'pending'
     order by n.created_at, n.id
     for update of n skip locked
     limit least(greatest(coalesce(_limit, 50), 1), 100)
  )
  update public.guest_addition_notifications n
     set sms_status = 'processing', sms_claimed_at = now(), sms_error = null
    from candidates c
   where n.id = c.id
  returning n.*;
end;
$$;
revoke all on function public.claim_guest_addition_sms_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_guest_addition_sms_notifications(integer)
  to service_role;
