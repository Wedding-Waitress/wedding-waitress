-- Approved shared guest memories. No rows, files, limits, moderation, passwords or event settings are changed.
CREATE OR REPLACE FUNCTION public.get_event_media_items_public(_token text)
RETURNS TABLE(id uuid,kind public.event_media_kind,mime_type text,storage_path text,duration_sec integer,
 uploader_name text,caption text,uploaded_at timestamptz,like_count integer,album text,
 share_photo_seq integer,share_video_seq integer,source_category text,is_photo_booth_strip boolean,photo_booth_seq integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT i.id,i.kind,i.mime_type,i.storage_path,i.duration_sec,i.uploader_name,coalesce(i.caption,i.guestbook_message),i.uploaded_at,
 i.like_count,i.album,i.share_photo_seq,i.share_video_seq,i.source_category,i.is_photo_booth_strip,i.photo_booth_seq
 FROM public.event_media_upload_tokens t
 JOIN public.event_media_galleries g ON g.id=t.gallery_id
 JOIN public.event_media_items i ON i.gallery_id=g.id
 WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now())
 AND g.is_open=true AND i.upload_status='uploaded' AND i.moderation_status='approved'
 AND i.source_category IN ('guest_upload','photo_booth','guestbook_recording')
 AND (i.kind IN ('photo','video') OR (i.kind='audio' AND i.source_category='guestbook_recording'))
 ORDER BY i.uploaded_at ASC NULLS LAST,i.created_at ASC
$$;
-- Only the password-checking Edge Function may read these public feeds.
REVOKE ALL ON FUNCTION public.get_event_media_items_public(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_media_items_public(text) TO service_role;
CREATE OR REPLACE FUNCTION public.get_guestbook_gallery_text(_token text)
RETURNS TABLE(id uuid,uploader_name text,message text,created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT m.id,m.uploader_name,m.message,m.created_at
 FROM public.event_media_upload_tokens t
 JOIN public.event_media_galleries g ON g.id=t.gallery_id
 JOIN public.event_guestbook_messages m ON m.gallery_id=g.id
 WHERE t.token=_token AND (t.expires_at IS NULL OR t.expires_at>now())
 AND g.is_open=true AND m.moderation_status='approved'
 ORDER BY m.created_at ASC,m.id ASC
$$;
REVOKE ALL ON FUNCTION public.get_guestbook_gallery_text(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_guestbook_gallery_text(text) TO service_role;
