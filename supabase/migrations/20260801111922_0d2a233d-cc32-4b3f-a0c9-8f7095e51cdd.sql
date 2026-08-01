CREATE TABLE public.event_guestbook_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  gallery_id uuid NOT NULL REFERENCES public.event_media_galleries(id) ON DELETE CASCADE,
  uploader_name text,
  message text NOT NULL,
  moderation_status text NOT NULL DEFAULT 'approved',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_guestbook_messages TO authenticated;
GRANT ALL ON public.event_guestbook_messages TO service_role;

ALTER TABLE public.event_guestbook_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_all_guestbook_messages ON public.event_guestbook_messages
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_guestbook_messages.event_id AND e.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_guestbook_messages.event_id AND e.user_id = auth.uid()));

CREATE INDEX idx_event_guestbook_messages_gallery ON public.event_guestbook_messages (gallery_id, created_at DESC);

CREATE TRIGGER update_event_guestbook_messages_updated_at
BEFORE UPDATE ON public.event_guestbook_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.submit_event_guestbook_text(_token text, _uploader_name text, _message text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _tok RECORD; _gal RECORD; _id uuid; _msg text;
BEGIN
  _msg := btrim(COALESCE(_message, ''));
  IF _msg = '' THEN RAISE EXCEPTION 'Message is empty'; END IF;
  IF length(_msg) > 2000 THEN RAISE EXCEPTION 'Message is too long'; END IF;

  SELECT * INTO _tok FROM public.event_media_upload_tokens WHERE token = _token;
  IF _tok IS NULL THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF _tok.expires_at IS NOT NULL AND _tok.expires_at <= now() THEN RAISE EXCEPTION 'Link expired'; END IF;

  SELECT * INTO _gal FROM public.event_media_galleries WHERE id = _tok.gallery_id;
  IF NOT _gal.is_open THEN RAISE EXCEPTION 'Gallery is closed'; END IF;

  INSERT INTO public.event_guestbook_messages (event_id, gallery_id, uploader_name, message)
  VALUES (_gal.event_id, _gal.id, NULLIF(btrim(COALESCE(_uploader_name,'')), ''), _msg)
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_event_guestbook_text(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_event_media_guestbook_public(_token text)
RETURNS TABLE(id uuid, uploader_name text, guestbook_message text, uploaded_at timestamp with time zone)
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
  SELECT * FROM (
    SELECT i.id, i.uploader_name, i.guestbook_message, i.uploaded_at
    FROM public.event_media_items i
    WHERE i.gallery_id = _tok.gallery_id
      AND i.moderation_status = 'approved'
      AND i.upload_status = 'uploaded'
      AND i.guestbook_message IS NOT NULL
      AND btrim(i.guestbook_message) <> ''
    UNION ALL
    SELECT m.id, m.uploader_name, m.message, m.created_at
    FROM public.event_guestbook_messages m
    WHERE m.gallery_id = _tok.gallery_id
      AND m.moderation_status = 'approved'
  ) q
  ORDER BY q.uploaded_at DESC NULLS LAST
  LIMIT 500;
END;
$function$;