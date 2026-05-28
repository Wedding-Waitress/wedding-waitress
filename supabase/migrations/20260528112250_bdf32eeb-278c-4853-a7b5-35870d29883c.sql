
ALTER TABLE public.event_media_galleries
  ADD COLUMN IF NOT EXISTS password_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_hash text;

DROP FUNCTION IF EXISTS public.get_event_media_gallery_host(uuid);
DROP FUNCTION IF EXISTS public.get_event_media_gallery_public(text);

CREATE FUNCTION public.get_event_media_gallery_host(_event_id uuid)
 RETURNS TABLE(gallery_id uuid, is_open boolean, primary_token text, max_photos integer, max_videos integer, max_total_bytes bigint, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_enabled boolean, has_password boolean)
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
    g.password_enabled, (g.password_hash IS NOT NULL)
  FROM public.event_media_galleries g
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  WHERE g.event_id = _event_id;
END;
$function$;

CREATE FUNCTION public.get_event_media_gallery_public(_token text)
 RETURNS TABLE(gallery_id uuid, event_id uuid, event_name text, event_date date, is_open boolean, partner1_name text, partner2_name text, max_photos integer, max_videos integer, max_video_bytes bigint, max_video_duration_sec integer, max_photo_bytes bigint, allowed_photo_mimes text[], allowed_video_mimes text[], gallery_title text, welcome_message text, show_event_date boolean, slideshow_photo_duration_sec integer, password_required boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, e.id, e.name, e.date, g.is_open,
    e.partner1_name, e.partner2_name,
    l.max_photos, l.max_videos, l.max_video_bytes, l.max_video_duration_sec,
    l.max_photo_bytes, l.allowed_photo_mimes, l.allowed_video_mimes,
    g.gallery_title, g.welcome_message, g.show_event_date, g.slideshow_photo_duration_sec,
    (g.password_enabled AND g.password_hash IS NOT NULL)
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.events e ON e.id = g.event_id
  LEFT JOIN public.event_media_limits l ON l.event_id = e.id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$function$;

-- Host: set or clear password
CREATE OR REPLACE FUNCTION public.set_event_media_password(
  _event_id uuid,
  _enabled boolean,
  _password text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _enabled THEN
    IF _password IS NOT NULL AND length(btrim(_password)) >= 4 THEN
      _hash := crypt(_password, gen_salt('bf', 10));
      UPDATE public.event_media_galleries
        SET password_enabled = true,
            password_hash = _hash,
            updated_at = now()
        WHERE event_id = _event_id;
    ELSIF _password IS NULL THEN
      -- enable without changing existing hash (must already have one)
      UPDATE public.event_media_galleries
        SET password_enabled = (password_hash IS NOT NULL),
            updated_at = now()
        WHERE event_id = _event_id;
    ELSE
      RAISE EXCEPTION 'Password must be at least 4 characters';
    END IF;
  ELSE
    -- disable; keep hash so user can re-enable, OR clear if password provided as empty? Clear when explicit empty string.
    UPDATE public.event_media_galleries
      SET password_enabled = false,
          password_hash = CASE WHEN _password = '' THEN NULL ELSE password_hash END,
          updated_at = now()
      WHERE event_id = _event_id;
  END IF;

  RETURN true;
END;
$function$;

-- Public: verify password for a token. Returns true/false. Never reveals hash.
CREATE OR REPLACE FUNCTION public.verify_event_media_password(
  _token text,
  _password text
)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
  _enabled boolean;
BEGIN
  SELECT g.password_hash, g.password_enabled
    INTO _hash, _enabled
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;

  IF _hash IS NULL OR NOT _enabled THEN
    -- No password set: treat as authorised
    RETURN true;
  END IF;

  IF _password IS NULL OR length(_password) = 0 THEN
    RETURN false;
  END IF;

  RETURN _hash = crypt(_password, _hash);
END;
$function$;
