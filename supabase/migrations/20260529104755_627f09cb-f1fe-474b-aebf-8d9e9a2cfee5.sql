
CREATE OR REPLACE FUNCTION public.register_event_guestbook_upload(
  _token text,
  _kind event_media_kind,
  _mime_type text,
  _byte_size bigint,
  _duration_sec integer,
  _uploader_name text,
  _message text,
  _filename text
)
 RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _tok RECORD; _gal RECORD; _lim RECORD;
  _total_bytes bigint;
  _ext text; _item_id uuid; _path text; _raw text;
  _allowed_video_mimes text[] := ARRAY['video/webm','video/mp4','video/quicktime'];
  _allowed_audio_mimes text[] := ARRAY['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-m4a','audio/aac'];
  _max_bytes bigint := 52428800; -- 50 MB
  _max_duration integer := 60;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid upload token'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Upload token expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;
  IF NOT _gal.video_guestbook_enabled THEN RAISE EXCEPTION 'Video Guestbook is not enabled'; END IF;

  IF _kind NOT IN ('video','audio') THEN RAISE EXCEPTION 'Unsupported guestbook kind'; END IF;
  IF _kind = 'video' AND NOT (_mime_type = ANY (_allowed_video_mimes)) THEN
    RAISE EXCEPTION 'Video type not allowed';
  END IF;
  IF _kind = 'audio' AND NOT (_mime_type = ANY (_allowed_audio_mimes)) THEN
    RAISE EXCEPTION 'Voice type not allowed';
  END IF;
  IF _byte_size > _max_bytes THEN RAISE EXCEPTION 'Recording too large'; END IF;
  IF _duration_sec IS NULL OR _duration_sec > _max_duration THEN RAISE EXCEPTION 'Recording too long (max 60s)'; END IF;

  SELECT * INTO _lim FROM public.event_media_limits WHERE event_id = _gal.event_id;
  IF _lim IS NULL THEN
    INSERT INTO public.event_media_limits (event_id) VALUES (_gal.event_id) RETURNING * INTO _lim;
  END IF;

  SELECT COALESCE(SUM(byte_size) FILTER (WHERE upload_status='uploaded'), 0)
    INTO _total_bytes
    FROM public.event_media_items WHERE event_id = _gal.event_id;
  IF _total_bytes + _byte_size > _lim.max_total_bytes THEN RAISE EXCEPTION 'Storage limit reached'; END IF;

  _ext := lower(regexp_replace(COALESCE(_filename, ''), '^.*\.', ''));
  IF _ext = '' OR _ext = COALESCE(_filename,'') THEN
    _ext := CASE _mime_type
      WHEN 'video/webm' THEN 'webm' WHEN 'video/mp4' THEN 'mp4' WHEN 'video/quicktime' THEN 'mov'
      WHEN 'audio/webm' THEN 'webm' WHEN 'audio/mp4' THEN 'm4a' WHEN 'audio/mpeg' THEN 'mp3'
      WHEN 'audio/ogg' THEN 'ogg' WHEN 'audio/wav' THEN 'wav' WHEN 'audio/x-m4a' THEN 'm4a' WHEN 'audio/aac' THEN 'aac'
      ELSE 'bin' END;
  END IF;

  _item_id := gen_random_uuid();
  _path := _gal.event_id::text || '/guestbook/' || _item_id::text || '.' || _ext;
  _raw := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.event_media_items (
    id, event_id, gallery_id, upload_token_id, storage_path, kind, mime_type, byte_size, duration_sec,
    uploader_name, caption, guestbook_message, is_guestbook,
    upload_status, upload_token_hash, upload_token_expires_at
  ) VALUES (
    _item_id, _gal.event_id, _gal.id, _tok.id, _path, _kind, _mime_type, _byte_size, _duration_sec,
    NULLIF(trim(_uploader_name), ''), NULL, NULLIF(trim(_message), ''), true,
    'pending', public._hash_upload_token(_raw), now() + interval '15 minutes'
  );

  RETURN QUERY SELECT _item_id, _path, _raw;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.register_event_guestbook_upload(text, event_media_kind, text, bigint, integer, text, text, text) TO anon, authenticated;
