drop trigger if exists guest_update_log_capture_addition on public.guest_update_logs;
drop function if exists public.capture_guest_addition_notification();
drop function if exists public.mark_guest_addition_reviewed(uuid, uuid);
drop function if exists public.set_guest_addition_email_preference(uuid, boolean);
drop table if exists public.guest_addition_notifications;
drop table if exists public.guest_addition_notification_preferences;
grant insert on public.guest_update_logs to anon;
create policy "Public can insert logs for live view events"
on public.guest_update_logs for insert
with check (exists (
  select 1 from public.events
  where events.id = guest_update_logs.event_id
    and events.qr_apply_to_live_view = true
));
