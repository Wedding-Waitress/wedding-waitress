ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS background_mode text NOT NULL DEFAULT 'preset',
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS background_image_url text;

DO $$ BEGIN
  ALTER TABLE public.event_media_galleries
    ADD CONSTRAINT event_media_galleries_background_mode_chk
    CHECK (background_mode IN ('preset','color','image'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS public.update_event_media_branding(uuid, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.update_event_media_branding(
  _event_id uuid,
  _theme_color text,
  _background_style text,
  _cover_image_url text,
  _logo_image_url text,
  _show_branding boolean,
  _background_mode text DEFAULT NULL,
  _background_color text DEFAULT NULL,
  _background_image_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _background_style IS NOT NULL AND _background_style NOT IN ('light','dark','cream') THEN
    RAISE EXCEPTION 'Invalid background_style';
  END IF;
  IF _background_mode IS NOT NULL AND _background_mode NOT IN ('preset','color','image') THEN
    RAISE EXCEPTION 'Invalid background_mode';
  END IF;
  IF _theme_color IS NOT NULL AND _theme_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid theme_color';
  END IF;
  IF _background_color IS NOT NULL AND _background_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid background_color';
  END IF;
  UPDATE public.event_media_galleries
  SET theme_color = _theme_color,
      background_style = COALESCE(_background_style, background_style),
      cover_image_url = _cover_image_url,
      logo_image_url = _logo_image_url,
      show_branding = COALESCE(_show_branding, show_branding),
      background_mode = COALESCE(_background_mode, background_mode),
      background_color = _background_color,
      background_image_url = _background_image_url,
      updated_at = now()
  WHERE event_id = _event_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_event_media_branding(uuid, text, text, text, text, boolean, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_event_media_branding(uuid, text, text, text, text, boolean, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, background_mode text, background_color text, background_image_url text, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text, slideshow_enabled boolean, guest_upload_enabled boolean, gallery_view_enabled boolean, guestbook_text_enabled boolean, slideshow_include_photos boolean, slideshow_include_videos boolean, slideshow_albums text[], slideshow_order text, slideshow_slide_duration_sec integer, slideshow_transition text, slideshow_show_caption boolean, slideshow_loop boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT g.id, g.is_open,
    (SELECT t.token FROM public.event_media_upload_tokens t WHERE t.gallery_id = g.id ORDER BY t.created_at ASC LIMIT 1) AS primary_token,
    l.max_photos, l.max_videos, l.max_total_bytes, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled, (g.password_hash IS NOT NULL) AS has_password,
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.background_mode, g.background_color, g.background_image_url,
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode,
    g.photo_booth_single_bottom_text, g.photo_booth_single_logo_url, g.photo_booth_single_template_url,
    g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url, g.photo_booth_strip_template_url,
    g.slideshow_enabled, g.guest_upload_enabled, g.gallery_view_enabled, g.guestbook_text_enabled,
    g.slideshow_include_photos, g.slideshow_include_videos, g.slideshow_albums, g.slideshow_order,
    g.slideshow_slide_duration_sec, g.slideshow_transition, g.slideshow_show_caption, g.slideshow_loop
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id AND g.user_id = auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.get_event_media_gallery_host(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_host(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_public(_token text)
RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, background_mode text, background_color text, background_image_url text, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text, slideshow_enabled boolean, guest_upload_enabled boolean, gallery_view_enabled boolean, guestbook_text_enabled boolean, slideshow_include_photos boolean, slideshow_include_videos boolean, slideshow_albums text[], slideshow_order text, slideshow_slide_duration_sec integer, slideshow_transition text, slideshow_show_caption boolean, slideshow_loop boolean)
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
  SELECT g.id, e.id, e.name, e.date, g.is_open, e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled,
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.background_mode, g.background_color, g.background_image_url,
    g.video_guestbook_enabled, g.photo_booth_enabled, g.photo_booth_mode,
    g.photo_booth_single_bottom_text, g.photo_booth_single_logo_url, g.photo_booth_single_template_url,
    g.photo_booth_strip_bottom_text, g.photo_booth_strip_logo_url, g.photo_booth_strip_template_url,
    g.slideshow_enabled, g.guest_upload_enabled, g.gallery_view_enabled, g.guestbook_text_enabled,
    g.slideshow_include_photos, g.slideshow_include_videos, g.slideshow_albums, g.slideshow_order,
    g.slideshow_slide_duration_sec, g.slideshow_transition, g.slideshow_show_caption, g.slideshow_loop
  FROM public.event_media_galleries g
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.id = _tok.gallery_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text) TO anon, authenticated;