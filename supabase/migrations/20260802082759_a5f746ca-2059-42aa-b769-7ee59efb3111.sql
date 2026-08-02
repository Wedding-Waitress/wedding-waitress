ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS share_video_seq integer;

CREATE OR REPLACE FUNCTION public.assign_share_video_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _next integer;
BEGIN
  IF NEW.share_video_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF NEW.kind <> 'video' OR COALESCE(NEW.source_category, 'guest_upload') <> 'guest_upload' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.is_guestbook, false) THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 43));

  SELECT COALESCE(MAX(share_video_seq), 0) + 1 INTO _next
  FROM public.event_media_items
  WHERE event_id = NEW.event_id;

  NEW.share_video_seq := _next;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_share_video_seq_ins ON public.event_media_items;
CREATE TRIGGER trg_assign_share_video_seq_ins
  BEFORE INSERT ON public.event_media_items
  FOR EACH ROW EXECUTE FUNCTION public.assign_share_video_seq();

DROP TRIGGER IF EXISTS trg_assign_share_video_seq_upd ON public.event_media_items;
CREATE TRIGGER trg_assign_share_video_seq_upd
  BEFORE UPDATE OF upload_status ON public.event_media_items
  FOR EACH ROW
  WHEN (NEW.upload_status = 'uploaded'::event_media_upload_status AND NEW.share_video_seq IS NULL)
  EXECUTE FUNCTION public.assign_share_video_seq();

WITH ranked AS (
  SELECT i.id,
         row_number() OVER (
           PARTITION BY i.event_id
           ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC, i.id ASC
         ) AS rn
  FROM public.event_media_items i
  WHERE i.share_video_seq IS NULL
    AND i.kind = 'video'
    AND COALESCE(i.source_category, 'guest_upload') = 'guest_upload'
    AND COALESCE(i.is_guestbook, false) = false
    AND i.upload_status = 'uploaded'
)
UPDATE public.event_media_items i
SET share_video_seq = r.rn
FROM ranked r
WHERE i.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS event_media_items_event_share_video_seq_key
  ON public.event_media_items (event_id, share_video_seq)
  WHERE share_video_seq IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean, like_count integer, source_category text, share_photo_seq integer, share_video_seq integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook, i.is_photo_booth, i.is_photo_booth_strip,
         i.like_count, i.source_category, i.share_photo_seq, i.share_video_seq
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_event_media_items_public(text);
CREATE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone, like_count integer, album text, share_photo_seq integer, share_video_seq integer, source_category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at, i.like_count, i.album,
         i.share_photo_seq, i.share_video_seq, i.source_category
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

GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_public(text) TO anon, authenticated, service_role;