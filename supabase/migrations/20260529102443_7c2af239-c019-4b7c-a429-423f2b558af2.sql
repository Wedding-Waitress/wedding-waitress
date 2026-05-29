
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS theme_color text,
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'cream',
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS logo_image_url text,
  ADD COLUMN IF NOT EXISTS show_branding boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  ALTER TABLE public.event_media_galleries
    ADD CONSTRAINT event_media_galleries_background_style_chk
    CHECK (background_style IN ('light','dark','cream'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media-branding','event-media-branding', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "branding_read_public" ON storage.objects FOR SELECT
    USING (bucket_id = 'event-media-branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "branding_insert_owner" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'event-media-branding' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "branding_update_owner" ON storage.objects FOR UPDATE
    USING (bucket_id = 'event-media-branding' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "branding_delete_owner" ON storage.objects FOR DELETE
    USING (bucket_id = 'event-media-branding' AND auth.uid()::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);
CREATE FUNCTION public.get_event_media_gallery_public(_token text)
 RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT g.id, e.id, e.name, e.date, g.is_open,
    e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec,
    l.max_photo_bytes, l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    (g.password_enabled AND g.password_hash IS NOT NULL),
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = e.id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$function$;

DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
CREATE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
 RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean, theme_color text, background_style text, cover_image_url text, logo_image_url text, show_branding boolean)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
    g.theme_color, g.background_style, g.cover_image_url, g.logo_image_url, g.show_branding
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_media_branding(
  _event_id uuid, _theme_color text, _background_style text,
  _cover_image_url text, _logo_image_url text, _show_branding boolean
) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _background_style IS NOT NULL AND _background_style NOT IN ('light','dark','cream') THEN
    RAISE EXCEPTION 'Invalid background_style';
  END IF;
  IF _theme_color IS NOT NULL AND _theme_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid theme_color';
  END IF;
  UPDATE public.event_media_galleries
  SET theme_color = _theme_color,
      background_style = COALESCE(_background_style, background_style),
      cover_image_url = _cover_image_url,
      logo_image_url = _logo_image_url,
      show_branding = COALESCE(_show_branding, show_branding),
      updated_at = now()
  WHERE event_id = _event_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_event_media_branding(uuid,text,text,text,text,boolean) TO authenticated;
