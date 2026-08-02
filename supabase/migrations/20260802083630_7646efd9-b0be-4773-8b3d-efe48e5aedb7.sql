ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS guestbook_recording_seq integer;

CREATE OR REPLACE FUNCTION public.assign_guestbook_recording_seq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _next integer;
BEGIN
  IF NEW.guestbook_recording_seq IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.upload_status <> 'uploaded' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.source_category, CASE WHEN COALESCE(NEW.is_guestbook, false) THEN 'guestbook_recording' ELSE 'guest_upload' END) <> 'guestbook_recording' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.event_id::text, 71));

  SELECT COALESCE(MAX(guestbook_recording_seq), 0) + 1 INTO _next
  FROM public.event_media_items
  WHERE event_id = NEW.event_id;

  NEW.guestbook_recording_seq := _next;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_guestbook_recording_seq_ins ON public.event_media_items;
CREATE TRIGGER trg_assign_guestbook_recording_seq_ins
BEFORE INSERT ON public.event_media_items
FOR EACH ROW EXECUTE FUNCTION public.assign_guestbook_recording_seq();

DROP TRIGGER IF EXISTS trg_assign_guestbook_recording_seq_upd ON public.event_media_items;
CREATE TRIGGER trg_assign_guestbook_recording_seq_upd
BEFORE UPDATE OF upload_status ON public.event_media_items
FOR EACH ROW WHEN (NEW.upload_status = 'uploaded')
EXECUTE FUNCTION public.assign_guestbook_recording_seq();

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY COALESCE(uploaded_at, created_at) ASC, created_at ASC, id ASC) AS rn
  FROM public.event_media_items
  WHERE guestbook_recording_seq IS NULL
    AND upload_status = 'uploaded'
    AND COALESCE(source_category, CASE WHEN COALESCE(is_guestbook, false) THEN 'guestbook_recording' ELSE 'guest_upload' END) = 'guestbook_recording'
)
UPDATE public.event_media_items m
SET guestbook_recording_seq = ordered.rn
FROM ordered
WHERE m.id = ordered.id;