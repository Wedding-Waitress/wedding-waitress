
-- Phase 3C: Add album/category field to media items
ALTER TABLE public.event_media_items
  ADD COLUMN IF NOT EXISTS album text;

ALTER TABLE public.event_media_items
  DROP CONSTRAINT IF EXISTS event_media_items_album_check;
ALTER TABLE public.event_media_items
  ADD CONSTRAINT event_media_items_album_check
  CHECK (album IS NULL OR album IN ('Ceremony','Reception','Dance Floor','Speeches','Bridal Party','Other'));

-- Update host items RPC to return album
DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.event_id = _event_id AND e.user_id = auth.uid() AND i.upload_status='uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;

-- Set album for one item (host only)
CREATE OR REPLACE FUNCTION public.set_event_media_album(_item_id uuid, _album text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _owner uuid;
BEGIN
  IF _album IS NOT NULL AND _album NOT IN ('Ceremony','Reception','Dance Floor','Speeches','Bridal Party','Other') THEN
    RAISE EXCEPTION 'Invalid album: %', _album;
  END IF;
  SELECT e.user_id INTO _owner
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.id = _item_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  UPDATE public.event_media_items SET album = _album WHERE id = _item_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_event_media_album(uuid, text) TO authenticated;

-- Bulk set album
CREATE OR REPLACE FUNCTION public.set_event_media_albums(_item_ids uuid[], _album text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _updated integer;
BEGIN
  IF _album IS NOT NULL AND _album NOT IN ('Ceremony','Reception','Dance Floor','Speeches','Bridal Party','Other') THEN
    RAISE EXCEPTION 'Invalid album: %', _album;
  END IF;
  WITH allowed AS (
    SELECT i.id
    FROM public.event_media_items i
    JOIN public.events e ON e.id = i.event_id
    WHERE i.id = ANY(_item_ids) AND e.user_id = auth.uid()
  )
  UPDATE public.event_media_items i
     SET album = _album
    FROM allowed a
   WHERE i.id = a.id;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_event_media_albums(uuid[], text) TO authenticated;
