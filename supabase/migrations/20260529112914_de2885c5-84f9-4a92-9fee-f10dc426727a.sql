-- Phase 3E Photo Booth templates: per-mode bottom text, logo, template artwork
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS photo_booth_single_bottom_text text,
  ADD COLUMN IF NOT EXISTS photo_booth_single_logo_url text,
  ADD COLUMN IF NOT EXISTS photo_booth_single_template_url text,
  ADD COLUMN IF NOT EXISTS photo_booth_strip_bottom_text text,
  ADD COLUMN IF NOT EXISTS photo_booth_strip_logo_url text,
  ADD COLUMN IF NOT EXISTS photo_booth_strip_template_url text;

-- Update template settings RPC (host only)
CREATE OR REPLACE FUNCTION public.update_event_media_photo_booth_template(
  _event_id uuid,
  _kind text,
  _bottom_text text,
  _logo_url text,
  _template_url text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _kind NOT IN ('single','strip') THEN RAISE EXCEPTION 'Invalid template kind'; END IF;
  IF _kind = 'single' THEN
    UPDATE public.event_media_galleries
       SET photo_booth_single_bottom_text = NULLIF(trim(_bottom_text), ''),
           photo_booth_single_logo_url = NULLIF(trim(_logo_url), ''),
           photo_booth_single_template_url = NULLIF(trim(_template_url), ''),
           updated_at = now()
     WHERE event_id = _event_id AND user_id = auth.uid();
  ELSE
    UPDATE public.event_media_galleries
       SET photo_booth_strip_bottom_text = NULLIF(trim(_bottom_text), ''),
           photo_booth_strip_logo_url = NULLIF(trim(_logo_url), ''),
           photo_booth_strip_template_url = NULLIF(trim(_template_url), ''),
           updated_at = now()
     WHERE event_id = _event_id AND user_id = auth.uid();
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gallery not found'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_event_media_photo_booth_template(uuid, text, text, text, text) TO authenticated;

-- Refresh host gallery RPC to expose template fields
DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text)
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
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode,
    g.photo_booth_single_bottom_text, g.photo_booth_single_logo_url, g.photo_booth_single_template_url,
    g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url, g.photo_booth_strip_template_url
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id AND g.user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_host(uuid) TO authenticated;

-- Refresh public gallery RPC to expose template fields
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE FUNCTION public.get_event_media_gallery_public(_token text)
RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text)
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
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode,
    g.photo_booth_single_bottom_text, g.photo_booth_single_logo_url, g.photo_booth_single_template_url,
    g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url, g.photo_booth_strip_template_url
  FROM public.event_media_galleries g
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.id = _tok.gallery_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text) TO anon, authenticated;