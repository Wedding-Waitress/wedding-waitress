-- 1) Classification column on media items (idempotent backfill, no data loss)
ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS source_category text;

UPDATE public.event_media_items
   SET source_category = CASE
     WHEN is_guestbook THEN 'guestbook_recording'
     WHEN is_photo_booth THEN 'photo_booth'
     ELSE 'guest_upload'
   END
 WHERE source_category IS NULL;

ALTER TABLE public.event_media_items ALTER COLUMN source_category SET DEFAULT 'guest_upload';
ALTER TABLE public.event_media_items ALTER COLUMN source_category SET NOT NULL;

ALTER TABLE public.event_media_items DROP CONSTRAINT IF EXISTS event_media_items_source_category_chk;
ALTER TABLE public.event_media_items
  ADD CONSTRAINT event_media_items_source_category_chk
  CHECK (source_category IN ('guest_upload','photo_booth','guestbook_recording'));

CREATE INDEX IF NOT EXISTS idx_event_media_items_event_source
  ON public.event_media_items (event_id, source_category);

-- Keep the classification authoritative and in sync with the legacy flags.
CREATE OR REPLACE FUNCTION public.event_media_items_set_source_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.source_category := CASE
    WHEN NEW.is_guestbook THEN 'guestbook_recording'
    WHEN NEW.is_photo_booth THEN 'photo_booth'
    ELSE 'guest_upload'
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_media_items_source_category ON public.event_media_items;
CREATE TRIGGER trg_event_media_items_source_category
BEFORE INSERT OR UPDATE OF is_guestbook, is_photo_booth ON public.event_media_items
FOR EACH ROW EXECUTE FUNCTION public.event_media_items_set_source_category();

-- 2) Classification on guestbook text messages
ALTER TABLE public.event_guestbook_messages ADD COLUMN IF NOT EXISTS source_category text;
UPDATE public.event_guestbook_messages SET source_category = 'guestbook_text' WHERE source_category IS NULL;
ALTER TABLE public.event_guestbook_messages ALTER COLUMN source_category SET DEFAULT 'guestbook_text';
ALTER TABLE public.event_guestbook_messages ALTER COLUMN source_category SET NOT NULL;
ALTER TABLE public.event_guestbook_messages DROP CONSTRAINT IF EXISTS event_guestbook_messages_source_category_chk;
ALTER TABLE public.event_guestbook_messages
  ADD CONSTRAINT event_guestbook_messages_source_category_chk
  CHECK (source_category = 'guestbook_text');

-- 3) Public media feed: public gallery media only
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone, like_count integer, album text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at, i.like_count, i.album
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id = g.id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND g.is_open = true
    AND i.upload_status = 'uploaded'
    AND i.moderation_status = 'approved'
    AND i.source_category IN ('guest_upload','photo_booth')
    AND i.is_guestbook = false
    AND i.kind IN ('photo','video')
  ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC;
$function$;

-- 4) Public usage counts exclude guestbook recordings (storage bytes remain total)
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_usage_public(_token text)
RETURNS TABLE(photos_used integer, videos_used integer, bytes_used bigint, max_photos integer, max_videos integer, max_total_bytes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(CASE WHEN i.kind = 'photo' AND i.source_category <> 'guestbook_recording' THEN 1 ELSE 0 END), 0)::int AS photos_used,
    COALESCE(SUM(CASE WHEN i.kind = 'video' AND i.source_category <> 'guestbook_recording' THEN 1 ELSE 0 END), 0)::int AS videos_used,
    COALESCE(SUM(i.byte_size), 0)::bigint AS bytes_used,
    l.max_photos, l.max_videos, l.max_total_bytes
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  LEFT JOIN public.event_media_items i ON i.event_id = g.event_id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  GROUP BY l.max_photos, l.max_videos, l.max_total_bytes
  LIMIT 1;
$function$;

-- 5) Host feed exposes the classification
DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean, like_count integer, source_category text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook, i.is_photo_booth, i.is_photo_booth_strip,
         i.like_count, i.source_category
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$function$;

-- 6) Remove the public guestbook feed entirely (guests may submit, never read)
DROP FUNCTION IF EXISTS public.get_event_media_guestbook_public(text);