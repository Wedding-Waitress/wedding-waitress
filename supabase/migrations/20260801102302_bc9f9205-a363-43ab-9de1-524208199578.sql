CREATE OR REPLACE FUNCTION public.get_event_media_guestbook_public(_token text)
 RETURNS TABLE(id uuid, uploader_name text, guestbook_message text, uploaded_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tok RECORD;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RETURN; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RETURN; END IF;
  RETURN QUERY
  SELECT i.id, i.uploader_name, i.guestbook_message, i.uploaded_at
  FROM public.event_media_items i
  WHERE i.gallery_id = _tok.gallery_id
    AND i.moderation_status = 'approved'
    AND i.upload_status = 'uploaded'
    AND i.guestbook_message IS NOT NULL
    AND btrim(i.guestbook_message) <> ''
  ORDER BY i.uploaded_at DESC NULLS LAST
  LIMIT 500;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_media_guestbook_public(text) TO anon, authenticated;