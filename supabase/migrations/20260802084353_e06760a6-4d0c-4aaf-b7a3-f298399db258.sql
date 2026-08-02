ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS photo_booth_seq integer;

CREATE OR REPLACE FUNCTION public.assign_photo_booth_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _next integer;
BEGIN
  IF NEW.photo_booth_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.source_category, CASE WHEN COALESCE(NEW.is_guestbook, false) THEN 'guestbook_recording' WHEN COALESCE(NEW.is_photo_booth, false) THEN 'photo_booth' ELSE 'guest_upload' END) <> 'photo_booth' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 73));

  SELECT COALESCE(MAX(photo_booth_seq), 0) + 1 INTO _next
  FROM public.event_media_items
  WHERE event_id = NEW.event_id;

  NEW.photo_booth_seq := _next;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_photo_booth_seq_ins ON public.event_media_items;
CREATE TRIGGER trg_assign_photo_booth_seq_ins
BEFORE INSERT ON public.event_media_items
FOR EACH ROW EXECUTE FUNCTION public.assign_photo_booth_seq();

DROP TRIGGER IF EXISTS trg_assign_photo_booth_seq_upd ON public.event_media_items;
CREATE TRIGGER trg_assign_photo_booth_seq_upd
BEFORE UPDATE OF upload_status ON public.event_media_items
FOR EACH ROW WHEN (NEW.upload_status = 'uploaded')
EXECUTE FUNCTION public.assign_photo_booth_seq();

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY COALESCE(uploaded_at, created_at) ASC, created_at ASC, id ASC) AS rn
  FROM public.event_media_items
  WHERE photo_booth_seq IS NULL
    AND upload_status = 'uploaded'
    AND COALESCE(source_category, CASE WHEN COALESCE(is_guestbook, false) THEN 'guestbook_recording' WHEN COALESCE(is_photo_booth, false) THEN 'photo_booth' ELSE 'guest_upload' END) = 'photo_booth'
)
UPDATE public.event_media_items m
SET photo_booth_seq = ordered.rn
FROM ordered
WHERE m.id = ordered.id;

DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);

CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean, like_count integer, source_category text, share_photo_seq integer, share_video_seq integer, guestbook_recording_seq integer, photo_booth_seq integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook, i.is_photo_booth, i.is_photo_booth_strip,
         i.like_count, i.source_category, i.share_photo_seq, i.share_video_seq, i.guestbook_recording_seq,
         i.photo_booth_seq
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$function$;