
ALTER TABLE public.event_media_items
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.event_media_items
  DROP CONSTRAINT IF EXISTS event_media_items_moderation_status_chk;
ALTER TABLE public.event_media_items
  ADD CONSTRAINT event_media_items_moderation_status_chk
  CHECK (moderation_status IN ('approved','hidden'));

CREATE INDEX IF NOT EXISTS idx_event_media_items_event_moderation
  ON public.event_media_items(event_id, moderation_status);

DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);

CREATE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(
  id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer,
  storage_path text, uploader_name text, caption text, guestbook_message text,
  uploaded_at timestamptz, moderation_status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.event_id = _event_id AND e.user_id = auth.uid() AND i.upload_status='uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.set_event_media_moderation(_item_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _status NOT IN ('approved','hidden') THEN
    RAISE EXCEPTION 'Invalid moderation status: %', _status;
  END IF;
  UPDATE public.event_media_items i
    SET moderation_status = _status
   FROM public.events e
   WHERE i.id = _item_id
     AND e.id = i.event_id
     AND e.user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorised or item not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_event_media_moderation(uuid, text) TO authenticated;
