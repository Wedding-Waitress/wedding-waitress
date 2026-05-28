-- Revert event-media bucket back to private
UPDATE storage.buckets SET public = false WHERE id = 'event-media';

-- Tighten Live View RPC: also require gallery is_open = true
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE (
  id uuid,
  kind public.event_media_kind,
  mime_type text,
  storage_path text,
  duration_sec integer,
  uploader_name text,
  caption text,
  uploaded_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.kind, i.mime_type, i.storage_path, i.duration_sec,
         i.uploader_name, i.caption, i.uploaded_at
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  JOIN public.event_media_items i ON i.gallery_id = g.id
  WHERE t.token = _token
    AND (t.expires_at IS NULL OR t.expires_at > now())
    AND g.is_open = true
    AND i.upload_status = 'uploaded'
    AND i.moderation_status = 'approved'
  ORDER BY i.uploaded_at ASC NULLS LAST, i.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_media_items_public(text) TO anon, authenticated;