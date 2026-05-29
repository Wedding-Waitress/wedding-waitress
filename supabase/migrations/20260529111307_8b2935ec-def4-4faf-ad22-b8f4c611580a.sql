
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS photo_booth_mode text NOT NULL DEFAULT 'single';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_media_galleries_photo_booth_mode_chk'
  ) THEN
    ALTER TABLE public.event_media_galleries
      ADD CONSTRAINT event_media_galleries_photo_booth_mode_chk
      CHECK (photo_booth_mode IN ('single','strip'));
  END IF;
END $$;

ALTER TABLE public.event_media_items
  ADD COLUMN IF NOT EXISTS is_photo_booth_strip boolean NOT NULL DEFAULT false;

-- Set mode RPC
CREATE OR REPLACE FUNCTION public.set_event_media_photo_booth_mode(_event_id uuid, _mode text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _mode NOT IN ('single','strip') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
  UPDATE public.event_media_galleries
     SET photo_booth_mode = _mode, updated_at = now()
   WHERE event_id = _event_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Gallery not found'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_event_media_photo_booth_mode(uuid, text) TO authenticated;

-- Refresh host gallery RPC to include mode
DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.is_open,
    (SELECT t.token FROM public.event_media_upload_tokens t WHERE t.gallery_id = g.id ORDER BY t.created_at ASC LIMIT 1) AS primary_token,
    l.max_photos, l.max_videos, l.max_total_bytes, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled, (g.password_hash IS NOT NULL) AS has_password,
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id AND g.user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_host(uuid) TO authenticated;

-- Refresh public gallery RPC to include mode
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE FUNCTION public.get_event_media_gallery_public(_token text)
RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _tok RECORD;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RETURN; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RETURN; END IF;
  RETURN QUERY
  SELECT g.id, e.id, e.name, e.date, g.is_open, e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled,
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode
  FROM public.event_media_galleries g
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.id = _tok.gallery_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text) TO anon, authenticated;

-- Refresh host items RPC to include strip flag
DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook, i.is_photo_booth, i.is_photo_booth_strip
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;

-- Replace upload register to accept strip flag
DROP FUNCTION IF EXISTS public.register_event_photobooth_upload(text, text, bigint, text, text);
CREATE OR REPLACE FUNCTION public.register_event_photobooth_upload(
  _token text,
  _mime_type text,
  _byte_size bigint,
  _uploader_name text,
  _filename text,
  _is_strip boolean DEFAULT false
)
RETURNS TABLE(item_id uuid, storage_path text, upload_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _tok RECORD; _gal RECORD; _lim RECORD;
  _total_bytes bigint; _photo_count int;
  _ext text; _item_id uuid; _path text; _raw text;
  _allowed_mimes text[] := ARRAY['image/jpeg','image/png','image/webp'];
  _max_bytes bigint := 25 * 1024 * 1024;
  _subdir text;
BEGIN
  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid upload token'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Upload token expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;
  IF NOT _gal.photo_booth_enabled THEN RAISE EXCEPTION 'Photo Booth is not enabled'; END IF;

  IF NOT (_mime_type = ANY (_allowed_mimes)) THEN RAISE EXCEPTION 'Photo type not allowed'; END IF;
  IF _byte_size > _max_bytes THEN RAISE EXCEPTION 'Photo too large'; END IF;

  SELECT * INTO _lim FROM public.event_media_limits WHERE event_id = _gal.event_id;
  IF _lim IS NULL THEN
    INSERT INTO public.event_media_limits (event_id) VALUES (_gal.event_id) RETURNING * INTO _lim;
  END IF;

  SELECT COALESCE(SUM(byte_size) FILTER (WHERE upload_status='uploaded'), 0)
    INTO _total_bytes FROM public.event_media_items WHERE event_id = _gal.event_id;
  IF _total_bytes + _byte_size > _lim.max_total_bytes THEN RAISE EXCEPTION 'Storage limit reached'; END IF;

  SELECT COUNT(*) INTO _photo_count
    FROM public.event_media_items
   WHERE event_id = _gal.event_id AND kind = 'photo' AND upload_status = 'uploaded';
  IF _photo_count >= _lim.max_photos THEN RAISE EXCEPTION 'Photo limit reached'; END IF;

  _ext := CASE _mime_type
    WHEN 'image/jpeg' THEN 'jpg' WHEN 'image/png' THEN 'png' WHEN 'image/webp' THEN 'webp' ELSE 'jpg' END;

  _item_id := gen_random_uuid();
  _subdir := CASE WHEN _is_strip THEN 'photobooth-strip' ELSE 'photobooth' END;
  _path := _gal.event_id::text || '/' || _subdir || '/' || _item_id::text || '.' || _ext;
  _raw := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.event_media_items (
    id, event_id, gallery_id, upload_token_id, storage_path, kind, mime_type, byte_size,
    uploader_name, is_photo_booth, is_photo_booth_strip,
    upload_status, upload_token_hash, upload_token_expires_at
  ) VALUES (
    _item_id, _gal.event_id, _gal.id, _tok.id, _path, 'photo', _mime_type, _byte_size,
    NULLIF(trim(_uploader_name), ''), true, COALESCE(_is_strip, false),
    'pending', public._hash_upload_token(_raw), now() + interval '15 minutes'
  );

  RETURN QUERY SELECT _item_id, _path, _raw;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.register_event_photobooth_upload(text, text, bigint, text, text, boolean) TO anon, authenticated;
