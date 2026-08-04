DROP FUNCTION IF EXISTS public.get_event_media_items_public(text);
CREATE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone, like_count integer, album text, share_photo_seq integer, share_video_seq integer, source_category text, is_photo_booth_strip boolean, photo_booth_seq integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at, i.like_count, i.album,
         i.share_photo_seq, i.share_video_seq, i.source_category,
         i.is_photo_booth_strip, i.photo_booth_seq
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id = g.id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND g.is_open = true
    AND i.upload_status = 'uploaded'
    AND i.moderation_status = 'approved'
    AND (
      (i.source_category IN ('guest_upload','photo_booth') AND i.is_guestbook = false AND i.kind IN ('photo','video'))
      OR (i.source_category = 'guestbook_recording' AND i.shared_to_gallery = true)
    )
  ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC;
$function$;