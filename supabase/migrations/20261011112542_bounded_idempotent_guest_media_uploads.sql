CREATE OR REPLACE FUNCTION public.register_event_media_upload(_token text, _kind event_media_kind, _mime_type text, _byte_size bigint, _duration_sec integer, _uploader_name text, _caption text, _guestbook_message text, _filename text, _album text DEFAULT 'Other'::text)
 RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  WHERE id = _tok.gallery_id FOR UPDATE;

  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;
  -- Gallery then token is the common lock order for registration/finalisation.
  SELECT * INTO _tok FROM public.event_media_upload_tokens
  WHERE id=_tok.id AND token=_token AND event_id=_gal.event_id
    AND (expires_at IS NULL OR expires_at>now()) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired upload token'; END IF;
  IF _tok.max_uploads IS NOT NULL AND _tok.uploads_used +
    (SELECT count(*) FROM public.event_media_items WHERE upload_token_id=_tok.id
      AND upload_status='pending' AND upload_token_expires_at>now()) >= _tok.max_uploads
  THEN RAISE EXCEPTION 'Upload quota reached'; END IF;
  IF _byte_size IS NULL OR _byte_size<=0 THEN RAISE EXCEPTION 'Invalid file size'; END IF;

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
    COALESCE(SUM(byte_size) FILTER (WHERE upload_status='uploaded' OR (upload_status='pending' AND upload_token_expires_at>now())),0)
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


ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS upload_request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS event_media_upload_request_unique
  ON public.event_media_items(upload_token_id,upload_request_id)
  WHERE upload_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.guest_media_upload_scope_active(_event uuid,_gallery uuid,_parent uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.event_media_upload_tokens t
    JOIN public.event_media_galleries g ON g.id=t.gallery_id
    WHERE t.id=_parent AND t.event_id=_event AND t.gallery_id=_gallery
      AND g.event_id=_event AND g.is_open AND g.guest_upload_enabled
      AND (t.expires_at IS NULL OR t.expires_at>now())
  );
$fn$;
REVOKE ALL ON FUNCTION private.guest_media_upload_scope_active(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.register_event_media_upload_v2(
  _token text,_request_id uuid,_upload_secret text,
  _kind public.event_media_kind,_mime_type text,_byte_size bigint,_duration_sec integer,
  _uploader_name text,_caption text,_guestbook_message text,_filename text,_album text DEFAULT 'Other'
)
RETURNS TABLE(item_id uuid,storage_path text,upload_token text,upload_token_expires_at timestamptz,already_uploaded boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions
AS $fn$
DECLARE t public.event_media_upload_tokens%ROWTYPE;
        g public.event_media_galleries%ROWTYPE;
        i public.event_media_items%ROWTYPE; registered record; deadline timestamptz;
BEGIN
  IF _request_id IS NULL OR _upload_secret IS NULL OR _upload_secret !~ '^[0-9a-f]{64}$'
  THEN RAISE EXCEPTION 'Invalid upload request'; END IF;
  SELECT * INTO t FROM public.event_media_upload_tokens WHERE token=_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid upload token'; END IF;
  SELECT * INTO g FROM public.event_media_galleries WHERE id=t.gallery_id FOR UPDATE;
  SELECT * INTO t FROM public.event_media_upload_tokens
    WHERE id=t.id AND token=_token FOR UPDATE;
  IF NOT FOUND OR NOT private.guest_media_upload_scope_active(t.event_id,t.gallery_id,t.id)
  THEN RAISE EXCEPTION 'Upload authorisation is unavailable'; END IF;
  SELECT * INTO i FROM public.event_media_items
    WHERE upload_token_id=t.id AND upload_request_id=_request_id FOR UPDATE;
  IF FOUND THEN
    IF i.event_id<>t.event_id OR i.gallery_id<>t.gallery_id
      OR i.upload_token_hash IS DISTINCT FROM public._hash_upload_token(_upload_secret)
      OR i.kind IS DISTINCT FROM _kind OR i.mime_type IS DISTINCT FROM _mime_type
      OR i.byte_size IS DISTINCT FROM _byte_size OR i.duration_sec IS DISTINCT FROM _duration_sec
      OR i.uploader_name IS DISTINCT FROM NULLIF(trim(_uploader_name),'')
      OR i.caption IS DISTINCT FROM NULLIF(trim(_caption),'')
      OR i.guestbook_message IS DISTINCT FROM NULLIF(trim(_guestbook_message),'')
      OR i.album IS DISTINCT FROM COALESCE(_album,'Other')
      OR i.upload_status NOT IN ('pending','uploaded')
      OR i.upload_token_expires_at<=now() OR i.created_at+interval '6 hours'<=now()
    THEN RAISE EXCEPTION 'Upload request cannot be resumed'; END IF;
    RETURN QUERY SELECT i.id,i.storage_path,_upload_secret,i.upload_token_expires_at,i.upload_status='uploaded';
    RETURN;
  END IF;
  SELECT * INTO registered FROM public.register_event_media_upload(
    _token,_kind,_mime_type,_byte_size,_duration_sec,_uploader_name,_caption,_guestbook_message,_filename,_album);
  deadline:=LEAST(now()+interval '6 hours',COALESCE(t.expires_at,now()+interval '6 hours'));
  UPDATE public.event_media_items SET upload_request_id=_request_id,
    upload_token_hash=public._hash_upload_token(_upload_secret),upload_token_expires_at=deadline
    WHERE id=registered.item_id;
  RETURN QUERY SELECT registered.item_id,registered.storage_path,_upload_secret,deadline,false;
END;
$fn$;
REVOKE ALL ON FUNCTION public.register_event_media_upload_v2(text,uuid,text,public.event_media_kind,text,bigint,integer,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_event_media_upload_v2(text,uuid,text,public.event_media_kind,text,bigint,integer,text,text,text,text,text) TO anon,authenticated,service_role;

-- Extend only currently valid ordinary gallery reservations made with the old
-- exact 15-minute window. Never resurrect expired, failed or revoked items.
UPDATE public.event_media_items i SET upload_token_expires_at=
  LEAST(i.created_at+interval '6 hours',COALESCE(t.expires_at,i.created_at+interval '6 hours'))
FROM public.event_media_upload_tokens t
WHERE i.upload_token_id=t.id AND i.upload_status='pending'
  AND i.source_category='guest_upload' AND NOT i.is_guestbook AND NOT i.is_photo_booth
  AND i.upload_token_used_at IS NULL AND i.upload_token_expires_at>now()
  AND i.upload_token_expires_at=i.created_at+interval '15 minutes'
  AND private.guest_media_upload_scope_active(i.event_id,i.gallery_id,i.upload_token_id);

CREATE OR REPLACE FUNCTION public.is_pending_event_media_path(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $fn$
 SELECT EXISTS (
  SELECT 1 FROM public.event_media_items i
  WHERE i.storage_path=_path AND i.upload_status='pending' AND i.upload_token_expires_at>now()
    AND (i.source_category<>'guest_upload' OR i.is_guestbook OR i.is_photo_booth
      OR (i.created_at+interval '6 hours'>now()
        AND private.guest_media_upload_scope_active(i.event_id,i.gallery_id,i.upload_token_id)))
 );
$fn$;

CREATE OR REPLACE FUNCTION public.finalize_event_media_upload(_item_id uuid,_upload_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $fn$
DECLARE i public.event_media_items%ROWTYPE; t public.event_media_upload_tokens%ROWTYPE;
BEGIN
 SELECT * INTO i FROM public.event_media_items
 WHERE id=_item_id AND upload_token_hash=public._hash_upload_token(_upload_token);
 IF NOT FOUND THEN RETURN false; END IF;
 IF i.source_category='guest_upload' AND NOT i.is_guestbook AND NOT i.is_photo_booth THEN
   -- Same lock order as registration; revocation cannot race a committed save.
   PERFORM 1 FROM public.event_media_galleries WHERE id=i.gallery_id FOR UPDATE;
   SELECT * INTO t FROM public.event_media_upload_tokens WHERE id=i.upload_token_id FOR UPDATE;
   IF NOT FOUND OR NOT private.guest_media_upload_scope_active(i.event_id,i.gallery_id,i.upload_token_id)
   THEN RETURN false; END IF;
 END IF;
 SELECT * INTO i FROM public.event_media_items
 WHERE id=_item_id AND upload_token_hash=public._hash_upload_token(_upload_token) FOR UPDATE;
 IF NOT FOUND OR i.upload_token_expires_at<=now()
   OR (i.source_category='guest_upload' AND NOT i.is_guestbook AND NOT i.is_photo_booth
       AND i.created_at+interval '6 hours'<=now())
 THEN RETURN false; END IF;
 IF i.upload_status='uploaded' AND i.upload_token_used_at IS NOT NULL THEN RETURN true; END IF;
 IF i.upload_status<>'pending' OR i.upload_token_used_at IS NOT NULL THEN RETURN false; END IF;
 IF i.source_category='guest_upload' AND NOT i.is_guestbook AND NOT i.is_photo_booth
   AND t.max_uploads IS NOT NULL AND t.uploads_used>=t.max_uploads THEN RETURN false; END IF;
 UPDATE public.event_media_items SET upload_status='uploaded',uploaded_at=now(),upload_token_used_at=now()
 WHERE id=i.id;
 IF i.upload_token_id IS NOT NULL THEN
   UPDATE public.event_media_upload_tokens SET uploads_used=uploads_used+1 WHERE id=i.upload_token_id;
 END IF;
 RETURN true;
END;
$fn$;
-- Replacement functions retain existing grants/ownership. No Storage policy
-- grants, bucket size limits, file quality or event duration/size limits change.
