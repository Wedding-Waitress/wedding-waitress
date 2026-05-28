
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS gallery_title text,
  ADD COLUMN IF NOT EXISTS welcome_message text,
  ADD COLUMN IF NOT EXISTS show_event_date boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slideshow_photo_duration_sec integer NOT NULL DEFAULT 8;

ALTER TABLE public.event_media_galleries
  DROP CONSTRAINT IF EXISTS event_media_galleries_slideshow_duration_chk;
ALTER TABLE public.event_media_galleries
  ADD CONSTRAINT event_media_galleries_slideshow_duration_chk
    CHECK (slideshow_photo_duration_sec BETWEEN 3 AND 60);

DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);

CREATE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
 RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer)
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
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id;
END;
$function$;

CREATE FUNCTION public.get_event_media_gallery_public(_token text)
 RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, e.id, e.name, e.date, g.is_open,
    e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec,
    l.max_photo_bytes, l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = e.id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_media_display_settings(
  _event_id uuid,
  _gallery_title text,
  _welcome_message text,
  _show_event_date boolean,
  _slideshow_photo_duration_sec integer
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.event_media_galleries SET
    gallery_title = NULLIF(btrim(COALESCE(_gallery_title, '')), ''),
    welcome_message = NULLIF(btrim(COALESCE(_welcome_message, '')), ''),
    show_event_date = COALESCE(_show_event_date, show_event_date),
    slideshow_photo_duration_sec = COALESCE(
      CASE WHEN _slideshow_photo_duration_sec BETWEEN 3 AND 60
           THEN _slideshow_photo_duration_sec END,
      slideshow_photo_duration_sec
    ),
    updated_at = now()
  WHERE event_id = _event_id;
  RETURN true;
END;
$function$;
