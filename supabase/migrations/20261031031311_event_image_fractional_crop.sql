-- Pointer dragging produces fractional crop percentages. Keep their precision in
-- onboarding and event edits, including drafts saved by already-open clients.
-- Existing bounds, defaults, ownership checks, RLS and records are preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.events
  ALTER COLUMN event_image_position_x TYPE numeric USING event_image_position_x::numeric,
  ALTER COLUMN event_image_position_y TYPE numeric USING event_image_position_y::numeric,
  ALTER COLUMN event_image_zoom TYPE numeric USING event_image_zoom::numeric;
NOTIFY pgrst, 'reload schema';
COMMIT;
