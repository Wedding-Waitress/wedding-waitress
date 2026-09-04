alter table public.events
  add column event_image_zoom smallint not null default 100;

alter table public.events
  add constraint events_event_image_zoom_check
    check (event_image_zoom between 100 and 200);

comment on column public.events.event_image_zoom is
  'Event branding crop zoom percentage. 100 is the natural Fill Frame size.';
