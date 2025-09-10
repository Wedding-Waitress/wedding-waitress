-- Add unique index to prevent duplicate guests per event (case-insensitive)
create unique index if not exists uniq_guest_name_per_event
on public.guests (
  event_id,
  lower(trim(first_name)),
  lower(trim(last_name))
);