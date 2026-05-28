
CREATE OR REPLACE FUNCTION public.is_pending_event_media_path(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_media_items
    WHERE storage_path = _path
      AND upload_status = 'pending'
      AND upload_token_expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pending_event_media_path(text) TO anon, authenticated;

DROP POLICY IF EXISTS anon_insert_pending_event_media ON storage.objects;

CREATE POLICY anon_insert_pending_event_media
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'event-media'
  AND public.is_pending_event_media_path(name)
);
