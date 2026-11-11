-- Private Digital Guestbook. No content, files, moderation or ordinary media are deleted.
-- Legacy sharing flags are inert immediately in all public readers; no bulk backfill.
DROP TRIGGER IF EXISTS guestbook_text_auto_share ON public.event_guestbook_messages;
DROP TRIGGER IF EXISTS guestbook_recording_auto_share ON public.event_media_items;

-- Retire the historical function too, so an older caller cannot restore auto-share.
CREATE OR REPLACE FUNCTION public.apply_guestbook_auto_share() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_TABLE_NAME='event_guestbook_messages' THEN
    NEW.shared_to_gallery := false;
  ELSIF NEW.source_category IS DISTINCT FROM 'video_wishes'
    AND (NEW.is_guestbook OR NEW.source_category='guestbook_recording') THEN
    NEW.shared_to_gallery := false;
    NEW.shared_to_slideshow := false;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_private_guestbook() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE was_private boolean := false;
BEGIN
  IF TG_TABLE_NAME='event_guestbook_messages' THEN
    IF NEW.shared_to_gallery AND (TG_OP='INSERT' OR NOT OLD.shared_to_gallery) THEN
      RAISE EXCEPTION 'Guestbook messages cannot be published';
    END IF;
    NEW.shared_to_gallery := false;
  ELSE
    IF TG_OP='UPDATE' THEN
      was_private := OLD.source_category IS DISTINCT FROM 'video_wishes'
        AND (OLD.is_guestbook OR OLD.source_category='guestbook_recording');
      IF was_private AND (NOT NEW.is_guestbook OR NEW.source_category IS DISTINCT FROM 'guestbook_recording') THEN
        RAISE EXCEPTION 'Guestbook recordings cannot be reclassified';
      END IF;
    END IF;
    IF was_private OR (NEW.source_category IS DISTINCT FROM 'video_wishes'
      AND (NEW.is_guestbook OR NEW.source_category='guestbook_recording')) THEN
      IF (NEW.shared_to_gallery AND (TG_OP='INSERT' OR NOT OLD.shared_to_gallery))
        OR (NEW.shared_to_slideshow AND (TG_OP='INSERT' OR NOT OLD.shared_to_slideshow)) THEN
        RAISE EXCEPTION 'Guestbook recordings cannot be published';
      END IF;
      NEW.is_guestbook := true;
      NEW.source_category := 'guestbook_recording';
      NEW.shared_to_gallery := false;
      NEW.shared_to_slideshow := false;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_private_guestbook() FROM PUBLIC,anon,authenticated;
-- Runs after category assignment and the independent Video Wishes guard.
CREATE TRIGGER zzzz_private_guestbook BEFORE INSERT OR UPDATE ON public.event_media_items
FOR EACH ROW EXECUTE FUNCTION public.guard_private_guestbook();
CREATE TRIGGER private_guestbook_text BEFORE INSERT OR UPDATE ON public.event_guestbook_messages
FOR EACH ROW EXECUTE FUNCTION public.guard_private_guestbook();

CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(id uuid,kind public.event_media_kind,mime_type text,storage_path text,duration_sec integer,
 uploader_name text,caption text,uploaded_at timestamptz,like_count integer,album text,
 share_photo_seq integer,share_video_seq integer,source_category text,is_photo_booth_strip boolean,photo_booth_seq integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT i.id,i.kind,i.mime_type,i.storage_path,i.duration_sec,i.uploader_name,i.caption,i.uploaded_at,
 i.like_count,i.album,i.share_photo_seq,i.share_video_seq,i.source_category,i.is_photo_booth_strip,i.photo_booth_seq
 FROM public.event_media_upload_tokens t
 JOIN public.event_media_galleries g ON g.id=t.gallery_id
 JOIN public.event_media_items i ON i.gallery_id=g.id
 WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now())
 AND g.is_open=true AND i.upload_status='uploaded' AND i.moderation_status='approved'
 AND i.source_category IN ('guest_upload','photo_booth') AND i.is_guestbook=false
 AND i.kind IN ('photo','video')
 ORDER BY i.uploaded_at ASC NULLS LAST,i.created_at ASC
$$;

CREATE OR REPLACE FUNCTION public.get_guestbook_gallery_text(_token text)
RETURNS TABLE(id uuid,uploader_name text,message text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT NULL::uuid,NULL::text,NULL::text,NULL::timestamptz WHERE false
$$;

CREATE OR REPLACE FUNCTION public.get_guestbook_auto_share(_event_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.events WHERE id=_event_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 RETURN false;
END $$;
CREATE OR REPLACE FUNCTION public.set_guestbook_auto_share(_event_id uuid,_enabled boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.events WHERE id=_event_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 RAISE EXCEPTION 'Guestbook sharing has been retired; messages are private';
END $$;
CREATE OR REPLACE FUNCTION public.set_event_media_guestbook_share(_item_id uuid,_shared boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.event_media_items i JOIN public.events e ON e.id=i.event_id WHERE i.id=_item_id AND e.user_id=auth.uid()) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 RAISE EXCEPTION 'Guestbook recordings cannot be published';
END $$;
-- CREATE OR REPLACE retains existing RPC ownership and grants. Existing owner/team
-- table and Storage RLS, registration/finalization, limits and Video Wishes are unchanged.
