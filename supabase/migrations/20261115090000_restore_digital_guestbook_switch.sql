-- Preserve the currently always-available experience while restoring an owner
-- switch. One setting controls all message kinds in a single transaction.
ALTER TABLE public.event_media_galleries
  ADD COLUMN digital_guestbook_enabled boolean NOT NULL DEFAULT true;

CREATE FUNCTION public.set_event_media_digital_guestbook(_event_id uuid,_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF public.current_planning_account_owner() IS NULL
     OR NOT public.can_access_event(auth.uid(),_event_id) THEN
    RAISE EXCEPTION 'Active event planning access required' USING ERRCODE='42501';
  END IF;
  IF _enabled IS NULL THEN RAISE EXCEPTION 'Enabled setting is required'; END IF;
  UPDATE public.event_media_galleries
  SET digital_guestbook_enabled=_enabled,guestbook_text_enabled=_enabled,
      video_guestbook_enabled=_enabled,updated_at=now()
  WHERE event_id=_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gallery unavailable'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_event_media_digital_guestbook(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_event_media_digital_guestbook(uuid,boolean) TO authenticated,service_role;

-- Keep deployed signatures, validation, token expiry, limits and grants intact.
DO $migration$
DECLARE target regprocedure; definition text; previous text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'public.get_event_media_gallery_host(uuid)'::regprocedure,
    'public.get_event_media_gallery_public(text)'::regprocedure
  ] LOOP
    definition:=pg_get_functiondef(target);
    previous:=definition;
    IF target='public.get_event_media_gallery_host(uuid)'::regprocedure THEN
      definition:=replace(definition,'g.video_guestbook_enabled','g.digital_guestbook_enabled');
      definition:=replace(definition,'g.guestbook_text_enabled','g.digital_guestbook_enabled');
    ELSE
      definition:=replace(definition,'true, g.photo_booth_enabled','g.digital_guestbook_enabled, g.photo_booth_enabled');
      definition:=replace(definition,'g.gallery_view_enabled, true,','g.gallery_view_enabled, g.digital_guestbook_enabled,');
    END IF;
    IF definition=previous THEN RAISE EXCEPTION 'Unrecognised Guestbook reader: %',target; END IF;
    EXECUTE definition;
  END LOOP;
  FOREACH target IN ARRAY ARRAY[
    'public.submit_event_guestbook_text(text,text,text)'::regprocedure,
    'public.register_event_guestbook_upload(text,public.event_media_kind,text,bigint,integer,text,text,text)'::regprocedure
  ] LOOP
    definition:=pg_get_functiondef(target);
    previous:=definition;
    definition:=replace(definition,
      'IF NOT _gal.is_open THEN RAISE EXCEPTION ''Gallery is closed''; END IF;',
      'IF NOT _gal.is_open THEN RAISE EXCEPTION ''Gallery is closed''; END IF;
  IF NOT _gal.digital_guestbook_enabled THEN RAISE EXCEPTION ''Digital Guestbook is disabled''; END IF;');
    IF definition=previous THEN RAISE EXCEPTION 'Unrecognised Guestbook submission guard: %',target; END IF;
    EXECUTE definition;
  END LOOP;
END;
$migration$;
