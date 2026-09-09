-- Atomically claim opted-in organiser alerts before contacting Resend. A
-- successful provider response means accepted for processing, not delivered.

alter table public.guest_addition_notifications
  drop constraint if exists guest_addition_notifications_email_status_check;
alter table public.guest_addition_notifications
  add constraint guest_addition_notifications_email_status_check
  check (email_status in ('pending', 'processing', 'queued', 'sent', 'failed', 'disabled', 'not_requested'));

alter table public.guest_addition_notifications
  add column if not exists email_claimed_at timestamptz,
  add column if not exists email_provider text,
  add column if not exists email_provider_id text;

create or replace function public.claim_guest_addition_email_notifications(_limit integer default 50)
returns setof public.guest_addition_notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.guest_addition_notifications n
     set email_status = 'disabled', email_error = null
   where n.email_status = 'pending'
     and not exists (
       select 1 from public.guest_addition_notification_preferences p
        where p.event_id = n.event_id and p.email_enabled = true
     );

  return query
  with candidates as (
    select n.id
      from public.guest_addition_notifications n
      join public.guest_addition_notification_preferences p
        on p.event_id = n.event_id and p.email_enabled = true
     where n.email_status = 'pending'
     order by n.created_at, n.id
     for update of n skip locked
     limit least(greatest(coalesce(_limit, 50), 1), 100)
  )
  update public.guest_addition_notifications n
     set email_status = 'processing', email_claimed_at = now(), email_error = null
    from candidates c
   where n.id = c.id
  returning n.*;
end;
$$;

revoke all on function public.claim_guest_addition_email_notifications(integer)
  from public, anon, authenticated;
grant execute on function public.claim_guest_addition_email_notifications(integer)
  to service_role;
