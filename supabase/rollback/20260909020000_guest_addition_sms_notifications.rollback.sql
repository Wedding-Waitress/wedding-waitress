drop function if exists public.claim_guest_addition_sms_notifications(integer);
drop function if exists public.set_guest_addition_sms_preference(uuid, boolean);
drop function if exists public.get_guest_addition_sms_eligibility(uuid);
drop index if exists public.guest_addition_notifications_sms_idx;
drop trigger if exists profiles_invalidate_organiser_phone_verification on public.profiles;
drop function if exists public.invalidate_organiser_phone_verification();
drop function if exists public.reserve_organiser_phone_otp_challenge(uuid, uuid, text, text, text);
drop table if exists public.organiser_phone_otp_challenges;
drop table if exists public.organiser_phone_verifications;

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
begin
  if new.changed_by is distinct from 'public_live_view'
     or new.payload->>'action' is distinct from 'add_guest' then return new; end if;
  select * into added_guest from public.guests where id = new.guest_id and event_id = new.event_id;
  referrer_id := added_guest.added_by_guest_id;
  select * into referrer from public.guests where id = referrer_id and event_id = new.event_id;
  choice := new.payload->>'group_choice';
  if added_guest.id is null or referrer.id is null or choice is null
     or choice not in ('separate', 'group') then return new; end if;
  wants_email := coalesce((
    select p.email_enabled from public.guest_addition_notification_preferences p
     where p.event_id = new.event_id
  ), false);
  insert into public.guest_addition_notifications(
    event_id, guest_id, added_by_guest_id, update_log_id, group_choice,
    added_guest_name, added_by_name, email_status, created_at
  ) values (
    new.event_id, new.guest_id, referrer.id, new.id, choice,
    btrim(added_guest.first_name || ' ' || added_guest.last_name),
    btrim(referrer.first_name || ' ' || referrer.last_name),
    case when wants_email then 'pending' else 'disabled' end,
    new.created_at
  ) on conflict (event_id, guest_id) do nothing;
  return new;
end;
$$;
revoke all on function public.capture_guest_addition_notification() from public, anon, authenticated;

alter table public.guest_addition_notifications
  drop column if exists sms_error,
  drop column if exists sms_provider_id,
  drop column if exists sms_provider,
  drop column if exists sms_queued_at,
  drop column if exists sms_claimed_at,
  drop column if exists sms_status;

alter table public.guest_addition_notification_preferences
  drop column if exists sms_enabled;
