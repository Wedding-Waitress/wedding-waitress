alter table public.events
  drop constraint if exists events_event_image_zoom_check;

alter table public.events
  drop column if exists event_image_zoom;
