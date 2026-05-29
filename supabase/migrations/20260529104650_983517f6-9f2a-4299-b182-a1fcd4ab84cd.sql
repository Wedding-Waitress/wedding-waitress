
-- 1. Add 'audio' to media kind enum
ALTER TYPE public.event_media_kind ADD VALUE IF NOT EXISTS 'audio';

-- 2. Add columns
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS video_guestbook_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.event_media_items
  ADD COLUMN IF NOT EXISTS is_guestbook boolean NOT NULL DEFAULT false;

-- 3. Toggle RPC for hosts
CREATE OR REPLACE FUNCTION public.set_event_media_video_guestbook(_event_id uuid, _enabled boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.event_media_galleries
     SET video_guestbook_enabled = _enabled, updated_at = now()
   WHERE event_id = _event_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.set_event_media_video_guestbook(uuid, boolean) TO authenticated;

-- 4. Update host gallery RPC to include video_guestbook_enabled
DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
 RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT g.id, g.is_open,
    (SELECT t.token FROM public.event_media_upload_tokens t WHERE t.gallery_id = g.id ORDER BY t.created_at ASC LIMIT 1),
    l.max_photos, l.max_videos, l.max_total_bytes, l.max_video_bytes, l.max_video_duration_sec, l.max_photo_bytes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    g.password_enabled, (g.password_hash IS NOT NULL),
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.video_guestbook_enabled
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_host(uuid) TO authenticated;

-- 5. Update public gallery RPC to include video_guestbook_enabled
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_gallery_public(_token text)
 RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean, video_guestbook_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, e.id, e.name, e.date, g.is_open,
    e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec,
    l.max_photo_bytes, l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    (g.password_enabled AND g.password_hash IS NOT NULL),
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding,
    g.video_guestbook_enabled
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = e.id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_public(text) TO anon, authenticated;

-- 6. Update host items query to include is_guestbook (keep prior album field)
DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE OR REPLACE FUNCTION public.get_event_media_items_host(_event_id uuid)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook
  FROM public.event_media_items i
  JOIN public.events e ON e.id = i.event_id
  WHERE i.event_id = _event_id AND e.user_id = auth.uid() AND i.upload_status='uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST;
$function$;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;

-- 7. Live View MUST stay unchanged in spirit: hide audio + guestbook items from the public feed
DROP FUNCTION IF EXISTS public.get_event_media_items_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at
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
GRANT EXECUTE ON FUNCTION public.get_event_media_items_public(text) TO anon, authenticated;
