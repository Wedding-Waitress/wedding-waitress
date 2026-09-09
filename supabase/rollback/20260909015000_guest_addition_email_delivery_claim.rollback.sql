drop function if exists public.claim_guest_addition_email_notifications(integer);

update public.guest_addition_notifications
   set email_status = 'pending', email_error = null
 where email_status = 'processing';

alter table public.guest_addition_notifications
  drop constraint if exists guest_addition_notifications_email_status_check;
alter table public.guest_addition_notifications
  add constraint guest_addition_notifications_email_status_check
  check (email_status in ('pending', 'queued', 'sent', 'failed', 'disabled', 'not_requested'));

alter table public.guest_addition_notifications
  drop column if exists email_provider_id,
  drop column if exists email_provider,
  drop column if exists email_claimed_at;
