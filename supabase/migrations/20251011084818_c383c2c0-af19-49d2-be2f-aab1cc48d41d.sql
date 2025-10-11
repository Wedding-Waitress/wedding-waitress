-- Drop the existing function first
DROP FUNCTION IF EXISTS public.validate_media_token(uuid, text);

-- Now recreate it with the new signature for galleries
CREATE OR REPLACE FUNCTION public.validate_media_token(_gallery_id UUID, _token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  can_upload BOOLEAN,
  remaining_uploads INTEGER,
  require_approval BOOLEAN,
  allow_photos BOOLEAN,
  allow_videos BOOLEAN,
  max_photo_size_mb INTEGER,
  max_video_size_mb INTEGER,
  gallery_title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _token_record RECORD;
  _settings_record RECORD;
  _gallery_record RECORD;
BEGIN
  SELECT * INTO _token_record
  FROM public.media_upload_tokens
  WHERE gallery_id = _gallery_id
    AND token = _token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, false, false, false, 0, 0, ''::TEXT;
    RETURN;
  END IF;

  SELECT * INTO _gallery_record
  FROM public.galleries
  WHERE id = _gallery_id;

  SELECT * INTO _settings_record
  FROM public.gallery_settings
  WHERE gallery_id = _gallery_id;

  RETURN QUERY SELECT
    true,
    (_token_record.uploads_used < _token_record.max_uploads),
    (_token_record.max_uploads - _token_record.uploads_used),
    COALESCE(_gallery_record.require_approval, true),
    COALESCE(_settings_record.allow_photos, true),
    COALESCE(_settings_record.allow_videos, true),
    COALESCE(_settings_record.max_photo_size_mb, 10),
    COALESCE(_settings_record.max_video_size_mb, 100),
    _gallery_record.title;
END;
$$;