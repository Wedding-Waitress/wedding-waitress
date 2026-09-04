begin;

-- Restore this first so rollback aborts without data loss if same-name guests now exist.
create unique index uniq_guest_name_per_event
  on public.guests (
    event_id,
    lower(trim(first_name)),
    lower(trim(last_name))
  );

drop index public.guests_event_guided_setup_origin_unique;
drop index public.guests_event_normalized_name_idx;

alter table public.guests
  drop constraint guests_guided_setup_origin_check,
  drop column guided_setup_origin;

commit;
