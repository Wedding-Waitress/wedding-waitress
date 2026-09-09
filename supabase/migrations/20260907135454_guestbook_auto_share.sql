-- Private by default; no backfill or bulk publication of existing messages.
ALTER TABLE public.event_media_galleries ADD COLUMN guestbook_auto_share boolean NOT NULL DEFAULT false;
ALTER TABLE public.event_guestbook_messages ADD COLUMN shared_to_gallery boolean NOT NULL DEFAULT false;

CREATE FUNCTION public.get_guestbook_auto_share(_event_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.events WHERE id=_event_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN (SELECT guestbook_auto_share FROM public.event_media_galleries WHERE event_id=_event_id);
END $$;
CREATE FUNCTION public.set_guestbook_auto_share(_event_id uuid,_enabled boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.events WHERE id=_event_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE public.event_media_galleries SET guestbook_auto_share=_enabled,updated_at=now() WHERE event_id=_event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gallery not found'; END IF;
  RETURN _enabled;
END $$;
REVOKE ALL ON FUNCTION public.get_guestbook_auto_share(uuid), public.set_guestbook_auto_share(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_guestbook_auto_share(uuid), public.set_guestbook_auto_share(uuid,boolean) TO authenticated;

CREATE FUNCTION public.apply_guestbook_auto_share() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_TABLE_NAME='event_guestbook_messages' THEN
    NEW.shared_to_gallery := COALESCE((SELECT guestbook_auto_share FROM public.event_media_galleries WHERE id=NEW.gallery_id),false);
  ELSIF NEW.source_category='guestbook_recording' THEN
    NEW.shared_to_gallery := COALESCE((SELECT guestbook_auto_share FROM public.event_media_galleries WHERE id=NEW.gallery_id),false);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.apply_guestbook_auto_share() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guestbook_text_auto_share BEFORE INSERT ON public.event_guestbook_messages FOR EACH ROW EXECUTE FUNCTION public.apply_guestbook_auto_share();
CREATE TRIGGER guestbook_recording_auto_share BEFORE INSERT ON public.event_media_items FOR EACH ROW EXECUTE FUNCTION public.apply_guestbook_auto_share();

-- Only the password-checked edge function may retrieve shared written messages.
CREATE FUNCTION public.get_guestbook_gallery_text(_token text)
RETURNS TABLE(id uuid,uploader_name text,message text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT m.id,m.uploader_name,m.message,m.created_at
 FROM public.event_media_upload_tokens t
 JOIN public.event_media_galleries g ON g.id=t.gallery_id
 JOIN public.event_guestbook_messages m ON m.gallery_id=g.id
 WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now())
 AND g.is_open AND g.gallery_view_enabled AND m.shared_to_gallery AND m.moderation_status='approved'
 ORDER BY m.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_guestbook_gallery_text(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_guestbook_gallery_text(text) TO service_role;
