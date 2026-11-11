-- Guestbook is always available through a valid, unexpired link to an open event.
-- Legacy flags remain for compatibility; do not rewrite event or message data.
-- Patch only the retired availability gates so differing deployed signatures,
-- validation, upload limits, sequences, deletion secrets and grants are retained.
DO $migration$
DECLARE
  target regprocedure;
  definition text;
BEGIN
  target := 'public.submit_event_guestbook_text(text,text,text)'::regprocedure;
  definition := pg_get_functiondef(target);
  definition := replace(definition, ' OR NOT _gallery.guestbook_text_enabled', '');
  -- Some deployed versions already have no text availability gate.
  IF definition ~ 'IF[^;]*guestbook_text_enabled' THEN
    RAISE EXCEPTION 'Unrecognised written Guestbook availability gate';
  END IF;
  EXECUTE definition;

  target := 'public.register_event_guestbook_upload(text,public.event_media_kind,text,bigint,integer,text,text,text)'::regprocedure;
  definition := pg_get_functiondef(target);
  definition := replace(definition,
    'IF NOT _gal.video_guestbook_enabled THEN RAISE EXCEPTION ''Video Guestbook is not enabled''; END IF;', '');
  -- The repository baseline wraps register_event_media_upload; keep its token
  -- lookup and all the authoritative registration checks, but ignore the flag.
  definition := regexp_replace(definition,
    'g\.video_guestbook_enabled([[:space:]]+INTO[[:space:]]+_event_id,[[:space:]]*_enabled)',
    'true\1', 'g');
  IF definition LIKE '%video_guestbook_enabled%' THEN
    RAISE EXCEPTION 'Unrecognised recording Guestbook availability gate';
  END IF;
  EXECUTE definition;

  -- Old clients also see the always-available contract. Closed/expired access
  -- still follows the existing is_open and token checks in this function.
  target := 'public.get_event_media_gallery_public(text)'::regprocedure;
  definition := pg_get_functiondef(target);
  definition := replace(definition, 'g.video_guestbook_enabled', 'true');
  definition := replace(definition, 'g.guestbook_text_enabled', 'true');
  EXECUTE definition;
END;
$migration$;
