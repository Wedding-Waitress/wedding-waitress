ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS slideshow_include_photos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slideshow_include_videos boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slideshow_albums text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS slideshow_order text NOT NULL DEFAULT 'newest',
  ADD COLUMN IF NOT EXISTS slideshow_slide_duration_sec integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS slideshow_transition text NOT NULL DEFAULT 'fade',
  ADD COLUMN IF NOT EXISTS slideshow_show_caption boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slideshow_loop boolean NOT NULL DEFAULT true;

ALTER TABLE public.event_media_galleries
  DROP CONSTRAINT IF EXISTS event_media_galleries_slideshow_order_chk,
  DROP CONSTRAINT IF EXISTS event_media_galleries_slideshow_transition_chk,
  DROP CONSTRAINT IF EXISTS event_media_galleries_slideshow_duration_chk;

ALTER TABLE public.event_media_galleries
  ADD CONSTRAINT event_media_galleries_slideshow_order_chk CHECK (slideshow_order IN ('newest','oldest','shuffle')),
  ADD CONSTRAINT event_media_galleries_slideshow_transition_chk CHECK (slideshow_transition IN ('fade','slide','none')),
  ADD CONSTRAINT event_media_galleries_slideshow_duration_chk CHECK (slideshow_slide_duration_sec IN (3,5,8,10));

-- Host meta RPC: expose slideshow settings
DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
 RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text, slideshow_enabled boolean, guest_upload_enabled boolean, gallery_view_enabled boolean, guestbook_text_enabled boolean, slideshow_include_photos boolean, slideshow_include_videos boolean, slideshow_albums text[], slideshow_order text, slideshow_slide_duration_sec integer, slideshow_transition text, slideshow_show_caption boolean, slideshow_loop boolean)
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

-- Public meta RPC: expose slideshow settings
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_public(_token text)
 RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean, photo_booth_enabled boolean, photo_booth_mode text, photo_booth_single_bottom_text text, photo_booth_single_logo_url text, photo_booth_single_template_url text, photo_booth_strip_bottom_text text, photo_booth_strip_logo_url text, photo_booth_strip_template_url text, slideshow_enabled boolean, guest_upload_enabled boolean, gallery_view_enabled boolean, guestbook_text_enabled boolean, slideshow_include_photos boolean, slideshow_include_videos boolean, slideshow_albums text[], slideshow_order text, slideshow_slide_duration_sec integer, slideshow_transition text, slideshow_show_caption boolean, slideshow_loop boolean)
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

-- Public items RPC: also return album so the slideshow can filter by album
DROP FUNCTION IF EXISTS public.get_event_media_items_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone, like_count integer, album text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at, i.like_count, i.album
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id = g.id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND g.is_open = true
    AND i.upload_status = 'uploaded'
    AND i.moderation_status = 'approved'
    AND i.is_guestbook = false
    AND i.kind IN ('photo','video')
  ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC;
$function$;

-- Save slideshow settings (owner only)
CREATE OR REPLACE FUNCTION public.update_event_media_slideshow_settings(
  _event_id uuid,
  _include_photos boolean,
  _include_videos boolean,
  _albums text[],
  _order text,
  _slide_duration_sec integer,
  _transition text,
  _show_caption boolean,
  _loop boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _include_photos IS NOT TRUE AND _include_videos IS NOT TRUE THEN
    RAISE EXCEPTION 'At least one of photos or videos must be enabled';
  END IF;

  UPDATE public.event_media_galleries g
  SET slideshow_include_photos = _include_photos,
      slideshow_include_videos = _include_videos,
      slideshow_albums = COALESCE(_albums, '{}'::text[]),
      slideshow_order = COALESCE(_order, 'newest'),
      slideshow_slide_duration_sec = COALESCE(_slide_duration_sec, 5),
      slideshow_transition = COALESCE(_transition, 'fade'),
      slideshow_show_caption = COALESCE(_show_caption, true),
      slideshow_loop = COALESCE(_loop, true)
  WHERE g.event_id = _event_id AND g.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gallery not found for this event';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_event_media_slideshow_settings(uuid, boolean, boolean, text[], text, integer, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_event_media_slideshow_settings(uuid, boolean, boolean, text[], text, integer, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_host(uuid) TO authenticated, service_role;