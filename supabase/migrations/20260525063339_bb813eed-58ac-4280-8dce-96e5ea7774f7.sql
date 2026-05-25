CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public._hash_upload_token(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(_raw, 'sha256'), 'hex')
$$;

CREATE TABLE public.event_media_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_media_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NULL,
  max_uploads integer NULL,
  uploads_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.event_media_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  max_photos integer NOT NULL DEFAULT 500,
  max_videos integer NOT NULL DEFAULT 50,
  max_total_bytes bigint NOT NULL DEFAULT 10737418240,
  max_video_bytes bigint NOT NULL DEFAULT 104857600,
  max_video_duration_sec integer NOT NULL DEFAULT 180,
  max_photo_bytes bigint NOT NULL DEFAULT 26214400,
  allowed_photo_mimes text[] NOT NULL DEFAULT ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'],
  allowed_video_mimes text[] NOT NULL DEFAULT ARRAY['video/mp4','video/quicktime'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE public.event_media_kind AS ENUM ('photo','video');
CREATE TYPE public.event_media_upload_status AS ENUM ('pending','uploaded','failed');

CREATE TABLE public.event_media_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  upload_token_id uuid REFERENCES public.event_media_upload_tokens(id) ON DELETE SET NULL,
  storage_path text NOT NULL UNIQUE,
  kind public.event_media_kind NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL,
  duration_sec integer NULL,
  uploader_name text NULL,
  caption text NULL,
  guestbook_message text NULL,
  upload_status public.event_media_upload_status NOT NULL DEFAULT 'pending',
  upload_token_hash text NULL,
  upload_token_expires_at timestamptz NULL,
  upload_token_used_at timestamptz NULL,
  uploaded_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_emi_event_status ON public.event_media_items(event_id, upload_status, created_at DESC);
CREATE INDEX idx_emi_gallery_status ON public.event_media_items(gallery_id, upload_status);
CREATE INDEX idx_emut_token ON public.event_media_upload_tokens(token);

ALTER TABLE public.event_media_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_upload_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_galleries" ON public.event_media_galleries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_all_tokens" ON public.event_media_upload_tokens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.event_media_galleries g
            WHERE g.id = event_media_upload_tokens.gallery_id AND g.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.event_media_galleries g
            WHERE g.id = event_media_upload_tokens.gallery_id AND g.user_id = auth.uid())
  );

CREATE POLICY "owner_all_limits" ON public.event_media_limits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_limits.event_id AND e.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_limits.event_id AND e.user_id = auth.uid())
  );

CREATE POLICY "owner_all_items" ON public.event_media_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_items.event_id AND e.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_media_items.event_id AND e.user_id = auth.uid())
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner_read_event_media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'event-media'
  AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    JOIN public.events e ON e.id = i.event_id
    WHERE i.storage_path = storage.objects.name AND e.user_id = auth.uid()
  )
);

CREATE POLICY "owner_delete_event_media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-media'
  AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    JOIN public.events e ON e.id = i.event_id
    WHERE i.storage_path = storage.objects.name AND e.user_id = auth.uid()
  )
);

CREATE POLICY "anon_insert_pending_event_media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-media'
  AND EXISTS (
    SELECT 1 FROM public.event_media_items i
    WHERE i.storage_path = storage.objects.name
      AND i.upload_status = 'pending'
      AND i.upload_token_expires_at > now()
  )
);

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
      replace(replace(encode(gen_random_bytes(24), 'base64'), '/', '_'), '+', '-'),
      NULL, NULL
    );
  END IF;

  RETURN _gid;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_media_gallery_open(_event_id uuid, _is_open boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.event_media_galleries SET is_open = _is_open, updated_at = now() WHERE event_id = _event_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_event_media_limits(
  _event_id uuid,
  _max_photos integer,
  _max_videos integer,
  _max_total_bytes bigint,
  _max_video_bytes bigint,
  _max_video_duration_sec integer,
  _max_photo_bytes bigint
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.event_media_limits (event_id) VALUES (_event_id) ON CONFLICT (event_id) DO NOTHING;
  UPDATE public.event_media_limits SET
    max_photos = COALESCE(_max_photos, max_photos),
    max_videos = COALESCE(_max_videos, max_videos),
    max_total_bytes = COALESCE(_max_total_bytes, max_total_bytes),
    max_video_bytes = COALESCE(_max_video_bytes, max_video_bytes),
    max_video_duration_sec = COALESCE(_max_video_duration_sec, max_video_duration_sec),
    max_photo_bytes = COALESCE(_max_photo_bytes, max_photo_bytes),
    updated_at = now()
  WHERE event_id = _event_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_gallery_public(_token text)
RETURNS TABLE (
  gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean,
  partner1_name text, partner2_name text,
  max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer,
  max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.id, e.id, e.name, e.date, g.is_open,
    e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec,
    l.max_photo_bytes, l.allowed_photo_mimes, l.allowed_video_mimes
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = e.id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
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
      WHEN 'image/heic' THEN 'heic' WHEN 'image/heif' THEN 'heif'
      WHEN 'video/mp4' THEN 'mp4' WHEN 'video/quicktime' THEN 'mov'
      ELSE 'bin' END;
  END IF;

  _item_id := gen_random_uuid();
  _path := _gal.event_id::text || '/' || _item_id::text || '.' || _ext;
  _raw := encode(gen_random_bytes(32), 'hex');

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

CREATE OR REPLACE FUNCTION public.finalize_event_media_upload(_item_id uuid, _upload_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ok boolean := false; _tok_id uuid;
BEGIN
  UPDATE public.event_media_items
  SET upload_status='uploaded', uploaded_at=now(), upload_token_used_at=now()
  WHERE id = _item_id
    AND upload_status='pending'
    AND upload_token_used_at IS NULL
    AND upload_token_expires_at > now()
    AND upload_token_hash = public._hash_upload_token(_upload_token)
  RETURNING upload_token_id INTO _tok_id;
  IF FOUND THEN
    _ok := true;
    IF _tok_id IS NOT NULL THEN
      UPDATE public.event_media_upload_tokens SET uploads_used = uploads_used + 1 WHERE id = _tok_id;
    END IF;
  END IF;
  RETURN _ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_event_media_upload(_item_id uuid, _upload_token text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.event_media_items
  SET upload_status='failed', upload_token_used_at = COALESCE(upload_token_used_at, now())
  WHERE id = _item_id
    AND upload_status='pending'
    AND upload_token_hash = public._hash_upload_token(_upload_token);
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE (
  id uuid, kind public.event_media_kind, mime_type text, byte_size bigint, duration_sec integer,
  storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message, i.uploaded_at
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.event_id = _event_id AND e.user_id = auth.uid() AND i.upload_status='uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.delete_event_media_item(_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _path text;
BEGIN
  SELECT i.storage_path INTO _path
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.id = _item_id AND e.user_id = auth.uid();
  IF _path IS NULL THEN RETURN false; END IF;
  DELETE FROM storage.objects WHERE bucket_id = 'event-media' AND name = _path;
  DELETE FROM public.event_media_items WHERE id = _item_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
RETURNS TABLE (
  gallery_id uuid, is_open boolean, primary_token text,
  max_photos integer, max_videos integer, max_total_bytes bigint,
  max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT g.id, g.is_open,
    (SELECT t.token FROM public.event_media_upload_tokens t WHERE t.gallery_id = g.id ORDER BY t.created_at ASC LIMIT 1),
    l.max_photos, l.max_videos, l.max_total_bytes, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id;
END;
$$;

ALTER TABLE public.event_media_items REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_media_items;