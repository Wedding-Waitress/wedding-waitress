-- Owner-approved removal of optional gallery passwords. Release alongside the
-- two-card Gallery View settings page; existing QR tokens remain unchanged.
BEGIN;

UPDATE public.event_media_galleries
SET password_enabled = false, password_hash = NULL, updated_at = now()
WHERE password_enabled OR password_hash IS NOT NULL;

ALTER TABLE public.event_media_galleries
  ADD CONSTRAINT event_media_gallery_passwords_retired
  CHECK (password_enabled = false AND password_hash IS NULL);

COMMIT;
