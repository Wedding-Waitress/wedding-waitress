ALTER TABLE public.event_guestbook_messages
  ADD COLUMN IF NOT EXISTS delete_token_hash text;

DROP FUNCTION IF EXISTS public.submit_event_guestbook_text(text, text, text);
CREATE FUNCTION public.submit_event_guestbook_text(_token text, _uploader_name text, _message text)
RETURNS TABLE(id uuid, delete_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _gallery public.event_media_galleries%ROWTYPE;
  _id uuid;
  _raw text := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  SELECT g.* INTO _gallery
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now());

  IF NOT FOUND OR NOT _gallery.is_open OR NOT _gallery.guestbook_text_enabled THEN
    RAISE EXCEPTION 'Guestbook is unavailable';
  END IF;
  IF length(trim(COALESCE(_uploader_name, ''))) < 1
    OR length(trim(COALESCE(_message, ''))) < 1
    OR length(_message) > 4000 THEN
    RAISE EXCEPTION 'Name and message are required';
  END IF;

  INSERT INTO public.event_guestbook_messages(
    event_id, gallery_id, uploader_name, message, guestbook_seq, delete_token_hash
  ) VALUES (
    _gallery.event_id, _gallery.id, trim(_uploader_name), trim(_message),
    public.next_event_media_seq(_gallery.event_id, 'guestbook_text'),
    public._hash_upload_token(_raw)
  ) RETURNING event_guestbook_messages.id INTO _id;

  RETURN QUERY SELECT _id, _raw;
END;
$$;

DROP FUNCTION IF EXISTS public.update_event_guestbook_text(text, uuid, text, text);
CREATE FUNCTION public.update_event_guestbook_text(
  _token text, _id uuid, _delete_token text, _uploader_name text, _message text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(trim(COALESCE(_uploader_name, ''))) < 1
    OR length(trim(COALESCE(_message, ''))) < 1
    OR length(_message) > 4000 THEN
    RAISE EXCEPTION 'Name and message are required';
  END IF;

  UPDATE public.event_guestbook_messages m
  SET uploader_name = trim(_uploader_name), message = trim(_message), updated_at = now()
  FROM public.event_media_upload_tokens t
  WHERE m.id = _id
    AND t.token = _token
    AND t.gallery_id = m.gallery_id
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND m.delete_token_hash = public._hash_upload_token(_delete_token);
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;
  RETURN _id;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_event_guestbook_text(text, uuid);
CREATE FUNCTION public.delete_event_guestbook_text(_token text, _id uuid, _delete_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.event_guestbook_messages m
  USING public.event_media_upload_tokens t
  WHERE m.id = _id
    AND t.token = _token
    AND t.gallery_id = m.gallery_id
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND m.delete_token_hash = public._hash_upload_token(_delete_token);
  RETURN FOUND;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_event_guestbook_media(text, uuid);
CREATE OR REPLACE FUNCTION public.consume_guestbook_media_delete(
  _token text, _item_id uuid, _delete_token text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _storage_path text;
BEGIN
  DELETE FROM public.event_media_items i
  USING public.event_media_upload_tokens t
  WHERE i.id = _item_id
    AND i.source_category = 'guestbook_recording'
    AND i.upload_status = 'uploaded'
    AND t.token = _token
    AND t.gallery_id = i.gallery_id
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND i.upload_token_hash = public._hash_upload_token(_delete_token)
  RETURNING i.storage_path INTO _storage_path;
  RETURN _storage_path;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_event_guestbook_text(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_event_guestbook_text(text, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_event_guestbook_text(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_guestbook_media_delete(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_event_guestbook_text(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_event_guestbook_text(text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_event_guestbook_text(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_guestbook_media_delete(text, uuid, text) TO anon, authenticated, service_role;
