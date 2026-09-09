-- Durable organiser review for guests added through the public guest-details form.
-- Existing add_guest logs are backfilled for in-app review only; they are never
-- queued for retroactive email delivery.

create table if not exists public.guest_addition_notification_preferences (
  event_id uuid primary key references public.events(id) on delete cascade,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_addition_notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  added_by_guest_id uuid references public.guests(id) on delete set null,
  update_log_id uuid not null references public.guest_update_logs(id) on delete cascade,
  group_choice text not null check (group_choice in ('separate', 'group')),
  added_guest_name text not null,
  added_by_name text not null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'queued', 'sent', 'failed', 'disabled', 'not_requested')),
  email_queued_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  unique (event_id, guest_id),
  unique (update_log_id)
);

create index if not exists guest_addition_notifications_event_review_idx
  on public.guest_addition_notifications(event_id, reviewed_at, created_at desc);
create index if not exists guest_addition_notifications_email_idx
  on public.guest_addition_notifications(email_status, created_at)
  where email_status = 'pending';

alter table public.guest_addition_notification_preferences enable row level security;
alter table public.guest_addition_notifications enable row level security;
revoke all on public.guest_addition_notification_preferences from public, anon;
revoke all on public.guest_addition_notifications from public, anon;
grant select, insert, update on public.guest_addition_notification_preferences to authenticated;
grant select on public.guest_addition_notifications to authenticated;

create policy "Event managers read guest addition preferences"
  on public.guest_addition_notification_preferences for select to authenticated
  using (public.can_access_event((select auth.uid()), event_id));
create policy "Event managers create guest addition preferences"
  on public.guest_addition_notification_preferences for insert to authenticated
  with check (public.can_access_event((select auth.uid()), event_id));
create policy "Event managers update guest addition preferences"
  on public.guest_addition_notification_preferences for update to authenticated
  using (public.can_access_event((select auth.uid()), event_id))
  with check (public.can_access_event((select auth.uid()), event_id));
create policy "Event managers read guest addition notifications"
  on public.guest_addition_notifications for select to authenticated
  using (public.can_access_event((select auth.uid()), event_id));

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
     or new.payload->>'action' is distinct from 'add_guest' then
    return new;
  end if;
  select * into added_guest from public.guests where id = new.guest_id and event_id = new.event_id;
  -- Attribution comes from the protected guest row, not caller-supplied JSON.
  referrer_id := added_guest.added_by_guest_id;
  select * into referrer from public.guests where id = referrer_id and event_id = new.event_id;
  choice := new.payload->>'group_choice';
  if added_guest.id is null or referrer.id is null or choice is null
     or choice not in ('separate', 'group') then
    return new;
  end if;
  wants_email := coalesce((select p.email_enabled from public.guest_addition_notification_preferences p where p.event_id = new.event_id), false);
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

drop trigger if exists guest_update_log_capture_addition on public.guest_update_logs;
create trigger guest_update_log_capture_addition
after insert on public.guest_update_logs
for each row execute function public.capture_guest_addition_notification();

-- Public guest flows write logs through reviewed SECURITY DEFINER RPCs. Direct
-- anonymous inserts could otherwise forge an organiser notification.
drop policy if exists "Public can insert logs for live view events" on public.guest_update_logs;
revoke insert on public.guest_update_logs from anon;

-- Backfill attributable existing additions, including Jason Smith, but do not
-- generate retroactive email alerts.
insert into public.guest_addition_notifications(
  event_id, guest_id, added_by_guest_id, update_log_id, group_choice,
  added_guest_name, added_by_name, email_status, created_at
)
select l.event_id, added.id, referrer.id, l.id, l.payload->>'group_choice',
  btrim(added.first_name || ' ' || added.last_name),
  btrim(referrer.first_name || ' ' || referrer.last_name),
  'not_requested', l.created_at
from public.guest_update_logs l
join public.guests added on added.id = l.guest_id and added.event_id = l.event_id
join public.guests referrer on referrer.id = added.added_by_guest_id
  and referrer.event_id = l.event_id
where l.changed_by = 'public_live_view'
  and l.payload->>'action' = 'add_guest'
  and l.payload->>'group_choice' in ('separate', 'group')
on conflict (event_id, guest_id) do nothing;

create or replace function public.mark_guest_addition_reviewed(_event_id uuid, _guest_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or not public.can_access_event((select auth.uid()), _event_id) then
    raise exception 'Not authorised';
  end if;
  update public.guest_addition_notifications
     set reviewed_at = coalesce(reviewed_at, now()),
         reviewed_by = coalesce(reviewed_by, (select auth.uid()))
   where event_id = _event_id and guest_id = _guest_id;
  return found;
end;
$$;
revoke all on function public.mark_guest_addition_reviewed(uuid, uuid) from public, anon;
grant execute on function public.mark_guest_addition_reviewed(uuid, uuid) to authenticated;

create or replace function public.set_guest_addition_email_preference(_event_id uuid, _enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null or not public.can_access_event((select auth.uid()), _event_id) then
    raise exception 'Not authorised';
  end if;
  insert into public.guest_addition_notification_preferences(event_id, email_enabled, updated_at)
  values (_event_id, coalesce(_enabled, false), now())
  on conflict (event_id) do update set email_enabled = excluded.email_enabled, updated_at = now();
  return true;
end;
$$;
revoke all on function public.set_guest_addition_email_preference(uuid, boolean) from public, anon;
grant execute on function public.set_guest_addition_email_preference(uuid, boolean) to authenticated;
