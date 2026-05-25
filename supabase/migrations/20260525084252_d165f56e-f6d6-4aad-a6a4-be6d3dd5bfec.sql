CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.ensure_event_media_gallery(_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gid uuid;
  _uid uuid;
BEGIN
  SELECT user_id INTO _uid FROM public.events WHERE id = _event_id;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Event not found'; END IF;
  IF _uid <> auth.uid() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT id INTO _gid FROM public.event_media_galleries WHERE event_id = _event_id;
  IF _gid IS NULL THEN
    INSERT INTO public.event_media_galleries (event_id, user_id) VALUES (_event_id, _uid)
    RETURNING id INTO _gid;
  END IF;

  INSERT INTO public.event_media_limits (event_id) VALUES (_event_id)
  ON CONFLICT (event_id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.event_media_upload_tokens WHERE gallery_id = _gid) THEN
    INSERT INTO public.event_media_upload_tokens (gallery_id, event_id, token, expires_at, max_uploads)
    VALUES (
      _gid, _event_id,
      replace(replace(encode(extensions.gen_random_bytes(24), 'base64'), '/', '_'), '+', '-'),
      NULL, NULL
    );
  END IF;

  RETURN _gid;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_event_media_upload(
  _token text,
  _kind public.event_media_kind,
  _mime_type text,
  _byte_size bigint,
  _duration_sec integer,
  _uploader_name text,
  _caption text,
  _guestbook_message text,
  _filename text
)
RETURNS TABLE (item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tok RECORD; _gal RECORD; _lim RECORD;
  _photo_count integer; _video_count integer; _total_bytes bigint;
  _ext text; _item_id uuid; _path text; _raw text;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid upload token'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Upload token expired'; END IF;
  IF _tok.max_uploads IS NOT NULL AND _tok.uploads_used >= _tok.max_uploads THEN RAISE EXCEPTION 'Upload quota reached'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;

  SELECT * INTO _lim FROM public.event_media_limits WHERE event_id = _gal.event_id;
  IF _lim IS NULL THEN
    INSERT INTO public.event_media_limits (event_id) VALUES (_gal.event_id) RETURNING * INTO _lim;
  END IF;

  IF _kind = 'photo' THEN
    IF NOT (_mime_type = ANY (_lim.allowed_photo_mimes)) THEN RAISE EXCEPTION 'Photo type not allowed'; END IF;
    IF _byte_size > _lim.max_photo_bytes THEN RAISE EXCEPTION 'Photo too large'; END IF;
  ELSE
    IF NOT (_mime_type = ANY (_lim.allowed_video_mimes)) THEN RAISE EXCEPTION 'Video type not allowed'; END IF;
    IF _byte_size > _lim.max_video_bytes THEN RAISE EXCEPTION 'Video too large'; END IF;
    IF _duration_sec IS NULL OR _duration_sec > _lim.max_video_duration_sec THEN RAISE EXCEPTION 'Video too long'; END IF;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE kind = 'photo' AND (upload_status='uploaded' OR (upload_status='pending' AND upload_token_expires_at > now()))),
    COUNT(*) FILTER (WHERE kind = 'video' AND (upload_status='uploaded' OR (upload_status='pending' AND upload_token_expires_at > now()))),
    COALESCE(SUM(byte_size) FILTER (WHERE upload_status='uploaded'), 0)
  INTO _photo_count, _video_count, _total_bytes
  FROM public.event_media_items WHERE event_id = _gal.event_id;

  IF _kind = 'photo' AND _photo_count >= _lim.max_photos THEN RAISE EXCEPTION 'Photo limit reached'; END IF;
  IF _kind = 'video' AND _video_count >= _lim.max_videos THEN RAISE EXCEPTION 'Video limit reached'; END IF;
  IF _total_bytes + _byte_size > _lim.max_total_bytes THEN RAISE EXCEPTION 'Storage limit reached'; END IF;

  _ext := lower(regexp_replace(COALESCE(_filename, ''), '^.*\.', ''));
  IF _ext = '' OR _ext = COALESCE(_filename,'') THEN
    _ext := CASE _mime_type
      WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp'
      WHEN 'video/mp4' THEN 'mp4' WHEN 'video/quicktime' THEN 'mov'
      ELSE 'bin' END;
  END IF;

  _item_id := gen_random_uuid();
  _path := _gal.event_id::text || '/' || _item_id::text || '.' || _ext;
  _raw := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.event_media_items (
    id, event_id, gallery_id, upload_token_id, storage_path, kind, mime_type, byte_size, duration_sec,
    uploader_name, caption, guestbook_message,
    upload_status, upload_token_hash, upload_token_expires_at
  ) VALUES (
    _item_id, _gal.event_id, _gal.id, _tok.id, _path, _kind, _mime_type, _byte_size, _duration_sec,
    NULLIF(trim(_uploader_name), ''), NULLIF(trim(_caption), ''), NULLIF(trim(_guestbook_message), ''),
    'pending', public._hash_upload_token(_raw), now() + interval '15 minutes'
  );

  RETURN QUERY SELECT _item_id, _path, _raw;
END;
$$;