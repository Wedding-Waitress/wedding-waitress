
-- Phase 1 fix: drop HEIC/HEIF from allowed photo mime types
ALTER TABLE public.event_media_limits
  ALTER COLUMN allowed_photo_mimes
  SET DEFAULT ARRAY['image/jpeg','image/png','image/webp'];

UPDATE public.event_media_limits
SET allowed_photo_mimes = ARRAY(
  SELECT m FROM unnest(allowed_photo_mimes) AS m
  WHERE m NOT IN ('image/heic','image/heif')
),
updated_at = now()
WHERE allowed_photo_mimes && ARRAY['image/heic','image/heif'];
