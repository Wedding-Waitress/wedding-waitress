CREATE OR REPLACE FUNCTION public.get_event_media_gallery_usage_public(_token text)
 RETURNS TABLE(photos_used integer, videos_used integer, bytes_used bigint, max_photos integer, max_videos integer, max_total_bytes bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(CASE WHEN i.kind = 'photo' THEN 1 ELSE 0 END), 0)::int AS photos_used,
    COALESCE(SUM(CASE WHEN i.kind = 'video' THEN 1 ELSE 0 END), 0)::int AS videos_used,
    COALESCE(SUM(i.byte_size), 0)::bigint AS bytes_used,
    l.max_photos, l.max_videos, l.max_total_bytes
  FROM public.event_media_upload_tokens t
  JOIN public.event_media_galleries g ON g.id = t.gallery_id
  LEFT JOIN public.event_media_limits l ON l.event_id = g.event_id
  LEFT JOIN public.event_media_items i ON i.event_id = g.event_id
  WHERE t.token = _token AND (t.expires_at IS NULL OR t.expires_at > now())
  GROUP BY l.max_photos, l.max_videos, l.max_total_bytes
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_event_media_gallery_usage_public(text) TO anon, authenticated;