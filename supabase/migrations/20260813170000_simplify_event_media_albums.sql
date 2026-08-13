-- Reduce gallery albums to the supported guest/organiser choices without
-- deleting media. Photo Booth and Guestbook rows may continue to have no
-- album; uncategorised guest uploads use the safe "Other" fallback.
UPDATE public.event_media_items
SET album = 'Other'
WHERE album IN ('Dance Floor', 'Speeches', 'Bridal Party')
   OR (
     album IS NULL
     AND source_category = 'guest_upload'
   );

ALTER TABLE public.event_media_items
  DROP CONSTRAINT IF EXISTS event_media_items_album_check;

ALTER TABLE public.event_media_items
  ADD CONSTRAINT event_media_items_album_check
  CHECK (album IS NULL OR album IN ('Ceremony', 'Reception', 'Other'));

-- Host-only album updates retain their ownership check. Null and the three
-- retired values are accepted as compatibility inputs and resolve to Other;
-- all other unsupported values remain errors.
CREATE OR REPLACE FUNCTION public.set_event_media_album(_item_id uuid, _album text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _owner uuid;
  _resolved_album text;
BEGIN
  IF _album IS NULL OR _album IN ('Dance Floor', 'Speeches', 'Bridal Party') THEN
    _resolved_album := 'Other';
  ELSIF _album IN ('Ceremony', 'Reception', 'Other') THEN
    _resolved_album := _album;
  ELSE
    RAISE EXCEPTION 'Invalid album: %', _album;
  END IF;

  SELECT e.user_id INTO _owner
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.id = _item_id;

  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  UPDATE public.event_media_items
  SET album = _resolved_album
  WHERE id = _item_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_event_media_album(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_event_media_album(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_event_media_albums(_item_ids uuid[], _album text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _updated integer;
  _resolved_album text;
BEGIN
  IF _album IS NULL OR _album IN ('Dance Floor', 'Speeches', 'Bridal Party') THEN
    _resolved_album := 'Other';
  ELSIF _album IN ('Ceremony', 'Reception', 'Other') THEN
    _resolved_album := _album;
  ELSE
    RAISE EXCEPTION 'Invalid album: %', _album;
  END IF;

  WITH allowed AS (
    SELECT i.id
    FROM public.event_media_items i
    JOIN public.events e ON e.id = i.event_id
    WHERE i.id = ANY(_item_ids) AND e.user_id = auth.uid()
  )
  UPDATE public.event_media_items i
  SET album = _resolved_album
  FROM allowed a
  WHERE i.id = a.id;

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_event_media_albums(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_event_media_albums(uuid[], text) TO authenticated;

-- Drop the old signature before adding a trailing optional argument. Keeping
-- both overloads would make a nine-key PostgREST RPC call ambiguous.
DROP FUNCTION IF EXISTS public.register_event_media_upload(
  text,
  public.event_media_kind,
  text,
  bigint,
  integer,
  text,
  text,
  text,
  text
);

CREATE FUNCTION public.register_event_media_upload(
  _token text,
  _kind public.event_media_kind,
  _mime_type text,
  _byte_size bigint,
  _duration_sec integer,
  _uploader_name text,
  _caption text,
  _guestbook_message text,
  _filename text,
  _album text DEFAULT 'Other'
)
RETURNS TABLE (item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _tok record;
  _gal record;
  _lim record;
  _photo_count integer;
  _video_count integer;
  _total_bytes bigint;
  _ext text;
  _item_id uuid;
  _path text;
  _raw text;
  _resolved_album text;
BEGIN
  SELECT * INTO _tok
  FROM public.event_media_upload_tokens
  WHERE token = _token;

  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid upload token'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Upload token expired'; END IF;
  IF _tok.max_uploads IS NOT NULL AND _tok.uploads_used >= _tok.max_uploads THEN RAISE EXCEPTION 'Upload quota reached'; END IF;

  SELECT * INTO _gal
  FROM public.event_media_galleries
  WHERE id = _tok.gallery_id;

  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;

  IF _album IS NULL OR _album IN ('Dance Floor', 'Speeches', 'Bridal Party') THEN
    _resolved_album := 'Other';
  ELSIF _album IN ('Ceremony', 'Reception', 'Other') THEN
    _resolved_album := _album;
  ELSE
    RAISE EXCEPTION 'Invalid album: %', _album;
  END IF;

  SELECT * INTO _lim
  FROM public.event_media_limits
  WHERE event_id = _gal.event_id;

  IF _lim IS NULL THEN
    INSERT INTO public.event_media_limits (event_id)
    VALUES (_gal.event_id)
    RETURNING * INTO _lim;
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
    COUNT(*) FILTER (WHERE kind = 'photo' AND (upload_status = 'uploaded' OR (upload_status = 'pending' AND upload_token_expires_at > now()))),
    COUNT(*) FILTER (WHERE kind = 'video' AND (upload_status = 'uploaded' OR (upload_status = 'pending' AND upload_token_expires_at > now()))),
    COALESCE(SUM(byte_size) FILTER (WHERE upload_status = 'uploaded'), 0)
  INTO _photo_count, _video_count, _total_bytes
  FROM public.event_media_items
  WHERE event_id = _gal.event_id;

  IF _kind = 'photo' AND _photo_count >= _lim.max_photos THEN RAISE EXCEPTION 'Photo limit reached'; END IF;
  IF _kind = 'video' AND _video_count >= _lim.max_videos THEN RAISE EXCEPTION 'Video limit reached'; END IF;
  IF _total_bytes + _byte_size > _lim.max_total_bytes THEN RAISE EXCEPTION 'Storage limit reached'; END IF;

  _ext := lower(regexp_replace(COALESCE(_filename, ''), '^.*\.', ''));
  IF _ext = '' OR _ext = COALESCE(_filename, '') THEN
    _ext := CASE _mime_type
      WHEN 'image/jpeg' THEN 'jpg'
      WHEN 'image/png' THEN 'png'
      WHEN 'image/webp' THEN 'webp'
      WHEN 'video/mp4' THEN 'mp4'
      WHEN 'video/quicktime' THEN 'mov'
      ELSE 'bin'
    END;
  END IF;

  _item_id := gen_random_uuid();
  _path := _gal.event_id::text || '/' || _item_id::text || '.' || _ext;
  _raw := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.event_media_items (
    id,
    event_id,
    gallery_id,
    upload_token_id,
    storage_path,
    kind,
    mime_type,
    byte_size,
    duration_sec,
    uploader_name,
    caption,
    guestbook_message,
    album,
    upload_status,
    upload_token_hash,
    upload_token_expires_at
  ) VALUES (
    _item_id,
    _gal.event_id,
    _gal.id,
    _tok.id,
    _path,
    _kind,
    _mime_type,
    _byte_size,
    _duration_sec,
    NULLIF(trim(_uploader_name), ''),
    NULLIF(trim(_caption), ''),
    NULLIF(trim(_guestbook_message), ''),
    _resolved_album,
    'pending',
    public._hash_upload_token(_raw),
    now() + interval '15 minutes'
  );

  RETURN QUERY SELECT _item_id, _path, _raw;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_event_media_upload(
  text,
  public.event_media_kind,
  text,
  bigint,
  integer,
  text,
  text,
  text,
  text,
  text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.register_event_media_upload(
  text,
  public.event_media_kind,
  text,
  bigint,
  integer,
  text,
  text,
  text,
  text,
  text
) TO anon, authenticated, service_role;
