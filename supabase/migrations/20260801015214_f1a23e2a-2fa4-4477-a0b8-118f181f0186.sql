-- 1. likes table
CREATE TABLE IF NOT EXISTS public.event_media_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.event_media_items(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, device_id)
);
GRANT ALL ON public.event_media_likes TO service_role;
ALTER TABLE public.event_media_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can view likes on their media"
ON public.event_media_likes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.id = event_media_likes.item_id AND g.user_id = auth.uid()
));
CREATE INDEX IF NOT EXISTS idx_event_media_likes_item ON public.event_media_likes(item_id);

-- 2. denormalised counter
ALTER TABLE public.event_media_items ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_event_media_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_media_items SET like_count = like_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
  ELSE
    UPDATE public.event_media_items SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS trg_event_media_like_count ON public.event_media_likes;
CREATE TRIGGER trg_event_media_like_count
AFTER INSERT OR DELETE ON public.event_media_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_event_media_like_count();

-- 3. guest toggle RPC (anonymous, token validated)
CREATE OR REPLACE FUNCTION public.toggle_event_media_like(_token text, _item_id uuid, _device_id text)
RETURNS TABLE(liked boolean, like_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ok boolean; _deleted int;
BEGIN
  IF _device_id IS NULL OR length(trim(_device_id)) < 8 THEN
    RAISE EXCEPTION 'invalid device id';
  END IF;
  SELECT true INTO _ok
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id = g.id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND g.is_open = true
    AND i.id = _item_id
    AND i.upload_status = 'uploaded'
    AND i.moderation_status = 'approved'
    AND i.is_guestbook = false
  LIMIT 1;
  IF _ok IS NOT TRUE THEN
    RAISE EXCEPTION 'item not available';
  END IF;

  DELETE FROM public.event_media_likes WHERE item_id = _item_id AND device_id = trim(_device_id);
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  IF _deleted = 0 THEN
    INSERT INTO public.event_media_likes(item_id, device_id) VALUES (_item_id, trim(_device_id))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT (_deleted = 0), i.like_count FROM public.event_media_items i WHERE i.id = _item_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.toggle_event_media_like(text, uuid, text) TO anon, authenticated;

-- 4. which items this device already liked
CREATE OR REPLACE FUNCTION public.get_event_media_likes_for_device(_token text, _device_id text)
RETURNS TABLE(item_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT l.item_id
  FROM public.event_media_likes l
  JOIN public.event_media_items i ON i.id = l.item_id
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  JOIN public.event_media_upload_tokens t ON t.gallery_id = g.id
  WHERE t.token = _token AND l.device_id = trim(_device_id);
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_likes_for_device(text, text) TO anon, authenticated;

-- 5. expose like_count on the public feed
DROP FUNCTION IF EXISTS public.get_event_media_items_public(text);
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
 RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, storage_path text, duration_sec integer, uploader_name text, caption text, uploaded_at timestamp with time zone, like_count integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at, i.like_count
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

-- 6. expose like_count to the host dashboard
DROP FUNCTION IF EXISTS public.get_event_media_items_host(uuid);
CREATE FUNCTION public.get_event_media_items_host(_event_id uuid)
RETURNS TABLE(id uuid, kind event_media_kind, mime_type text, byte_size bigint, duration_sec integer, storage_path text, uploader_name text, caption text, guestbook_message text, uploaded_at timestamp with time zone, moderation_status text, album text, is_guestbook boolean, is_photo_booth boolean, is_photo_booth_strip boolean, like_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.kind, i.mime_type, i.byte_size, i.duration_sec,
         i.storage_path, i.uploader_name, i.caption, i.guestbook_message,
         i.uploaded_at, i.moderation_status, i.album, i.is_guestbook, i.is_photo_booth, i.is_photo_booth_strip,
         i.like_count
  FROM public.event_media_items i
  JOIN public.event_media_galleries g ON g.id = i.gallery_id
  WHERE i.event_id = _event_id AND g.user_id = auth.uid() AND i.upload_status = 'uploaded'
  ORDER BY i.uploaded_at DESC NULLS LAST, i.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_host(uuid) TO authenticated;