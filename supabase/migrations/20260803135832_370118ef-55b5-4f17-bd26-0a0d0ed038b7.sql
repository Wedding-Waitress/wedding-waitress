ALTER TABLE public.event_media_items
  ADD COLUMN IF NOT EXISTS shared_to_gallery boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_event_media_guestbook_share(_item_id uuid, _shared boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.event_media_items i
     SET shared_to_gallery = _shared
    FROM public.events e
   WHERE i.id = _item_id
     AND e.id = i.event_id
     AND e.user_id = auth.uid()
     AND i.source_category = 'guestbook_recording';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorised or item not found';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_event_media_guestbook_share(uuid, boolean) TO authenticated;

DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);

CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean, like_count integer, source_category text, share_photo_seq integer, share_video_seq integer, guestbook_recording_seq integer, photo_booth_seq integer, shared_to_gallery boolean)
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
         i.photo_booth_seq, i.shared_to_gallery
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
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
    AND i.kind IN ('photo','video')
    AND (
      (i.source_category IN ('guest_upload','photo_booth') AND i.is_guestbook = false)
      OR (i.source_category = 'guestbook_recording' AND i.shared_to_gallery = true)
    )
  ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC;
$function$;
