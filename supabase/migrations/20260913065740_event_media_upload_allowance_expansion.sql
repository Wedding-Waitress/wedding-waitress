-- Approved event-wide allowance, identical across all three couple packages.
-- Preserve all media rows/objects and existing usage. No billing changes.
BEGIN;
ALTER TABLE public.event_media_limits
  ALTER COLUMN max_photos SET DEFAULT 5000,
  ALTER COLUMN max_videos SET DEFAULT 100,
  ALTER COLUMN max_video_duration_sec SET DEFAULT 300,
  ALTER COLUMN max_total_bytes SET DEFAULT 10737418240;

-- This administrative allowance backfill must also cover expired events.
-- Use the existing service-context branch only within this migration; keep
-- customer expiry guards enabled and restore the prior request context.
DO $$
DECLARE previous_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE public.event_media_limits SET
    max_photos = 5000,
    max_videos = 100,
    max_video_duration_sec = 300,
    max_total_bytes = 10737418240,
    updated_at = now();
  PERFORM set_config('request.jwt.claim.role', coalesce(previous_role, ''), true);
END $$;

-- Existing upload RPCs enforce these values, including count and storage
-- checks. Constraints also prevent owner settings/API calls exceeding them.
ALTER TABLE public.event_media_limits
  ADD CONSTRAINT event_media_approved_photo_cap CHECK (max_photos BETWEEN 1 AND 5000),
  ADD CONSTRAINT event_media_approved_video_cap CHECK (max_videos BETWEEN 0 AND 100),
  ADD CONSTRAINT event_media_approved_duration_cap CHECK (max_video_duration_sec BETWEEN 1 AND 300),
  ADD CONSTRAINT event_media_approved_storage_cap CHECK (max_total_bytes BETWEEN 1 AND 10737418240);
COMMIT;
