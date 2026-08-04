CREATE OR REPLACE FUNCTION public.update_event_guestbook_text(_token text, _id uuid, _uploader_name text, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _tok RECORD; _gal RECORD; _msg text; _out uuid;
BEGIN
  _msg := btrim(COALESCE(_message, ''));
  IF _msg = '' THEN RAISE EXCEPTION 'Message is empty'; END IF;
  IF length(_msg) > 2000 THEN RAISE EXCEPTION 'Message is too long'; END IF;

  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Link expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;

  UPDATE public.event_guestbook_messages
     SET message = _msg,
         uploader_name = NULLIF(btrim(COALESCE(_uploader_name,'')), ''),
         updated_at = now()
   WHERE id = _id
     AND gallery_id = _gal.id
     AND created_at > now() - interval '24 hours'
  RETURNING id INTO _out;

  IF _out IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;
  RETURN _out;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_event_guestbook_text(text, uuid, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_event_guestbook_text(_token text, _id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _tok RECORD; _gal RECORD; _out uuid;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Link expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;

  DELETE FROM public.event_guestbook_messages
   WHERE id = _id
     AND gallery_id = _gal.id
     AND created_at > now() - interval '24 hours'
  RETURNING id INTO _out;

  RETURN _out IS NOT NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_event_guestbook_text(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_event_guestbook_media(_token text, _item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public, storage'
AS $function$
DECLARE _tok RECORD; _gal RECORD; _path text;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Link expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;

  DELETE FROM public.event_media_items
   WHERE id = _item_id
     AND gallery_id = _gal.id
     AND upload_token_id = _tok.id
     AND is_guestbook = true
     AND created_at > now() - interval '24 hours'
  RETURNING storage_path INTO _path;

  IF _path IS NULL THEN RETURN false; END IF;

  DELETE FROM storage.objects WHERE bucket_id = 'event-media' AND name = _path;
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_event_guestbook_media(text, uuid) TO anon, authenticated;