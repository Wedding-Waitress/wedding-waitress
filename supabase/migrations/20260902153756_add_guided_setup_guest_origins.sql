alter table public.guests
  add column guided_setup_origin text;

alter table public.guests
  add constraint guests_guided_setup_origin_check
  check (
    guided_setup_origin is null
    or guided_setup_origin in (
      'wedding_couple_1',
      'wedding_couple_2',
      'engagement_couple_1',
      'engagement_couple_2',
      'birthday_celebrant'
    )
  );

create unique index guests_event_guided_setup_origin_unique
  on public.guests (event_id, guided_setup_origin)
  where guided_setup_origin is not null;

-- A name cannot be an identity key: legitimate guests may share the same name.
drop index if exists public.uniq_guest_name_per_event;

create index guests_event_normalized_name_idx
  on public.guests (
    event_id,
    lower(trim(first_name)),
    lower(trim(last_name))
  );

comment on column public.guests.guided_setup_origin is
  'Internal idempotency key for guests provisioned by Guided Event Setup.';
