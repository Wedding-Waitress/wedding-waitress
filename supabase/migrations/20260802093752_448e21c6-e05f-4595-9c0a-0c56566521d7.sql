CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_event_media_password(_event_id uuid, _enabled boolean, _password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _hash text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _enabled THEN
    IF _password IS NOT NULL AND length(btrim(_password)) >= 4 THEN
      _hash := extensions.crypt(_password, extensions.gen_salt('bf'::text, 12));
      UPDATE public.event_media_galleries
        SET password_enabled = true,
            password_hash = _hash,
            updated_at = now()
        WHERE event_id = _event_id;
    ELSIF _password IS NULL THEN
      UPDATE public.event_media_galleries
        SET password_enabled = (password_hash IS NOT NULL),
            updated_at = now()
        WHERE event_id = _event_id;
    ELSE
      RAISE EXCEPTION 'Password must be at least 4 characters';
    END IF;
  ELSE
    UPDATE public.event_media_galleries
      SET password_enabled = false,
          password_hash = CASE WHEN _password = '' THEN NULL ELSE password_hash END,
          updated_at = now()
      WHERE event_id = _event_id;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_event_media_password(_token text, _password text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
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
    RETURN true;
  END IF;

  IF _password IS NULL OR length(_password) = 0 THEN
    RETURN false;
  END IF;

  RETURN _hash = extensions.crypt(_password, _hash);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_event_media_password(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_event_media_password(uuid, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_event_media_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_event_media_password(text, text) TO anon, authenticated;