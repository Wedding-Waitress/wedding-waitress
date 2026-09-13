-- Data-preserving rollback: keep all media, usage and current event allowances.
-- Restore the former defaults for future events only. If existing allowances
-- must be reverted, restore their exact saved values from the release backup
-- under the reviewed administrative request context; never delete uploads.
BEGIN;
ALTER TABLE public.event_media_limits
  DROP CONSTRAINT IF EXISTS event_media_approved_photo_cap,
  DROP CONSTRAINT IF EXISTS event_media_approved_video_cap,
  DROP CONSTRAINT IF EXISTS event_media_approved_duration_cap,
  DROP CONSTRAINT IF EXISTS event_media_approved_storage_cap;
ALTER TABLE public.event_media_limits
  ALTER COLUMN max_photos SET DEFAULT 500,
  ALTER COLUMN max_videos SET DEFAULT 50,
  ALTER COLUMN max_video_duration_sec SET DEFAULT 180,
  ALTER COLUMN max_total_bytes SET DEFAULT 10737418240;
COMMIT;
