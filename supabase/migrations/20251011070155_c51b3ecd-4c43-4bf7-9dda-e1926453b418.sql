-- Photo & Video Sharing Module - Database Schema

-- 1. Create media_uploads table
CREATE TABLE public.media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_token TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  caption TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  cloudflare_stream_uid TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  file_size_bytes BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID
);

CREATE INDEX idx_media_uploads_event_id ON public.media_uploads(event_id);
CREATE INDEX idx_media_uploads_status ON public.media_uploads(status);
CREATE INDEX idx_media_uploads_created_at ON public.media_uploads(created_at DESC);
CREATE INDEX idx_media_uploads_event_status ON public.media_uploads(event_id, status);

ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view their event media"
  ON public.media_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update their event media"
  ON public.media_uploads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete their event media"
  ON public.media_uploads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

-- 2. Create media_upload_tokens table
CREATE TABLE public.media_upload_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uploads INTEGER DEFAULT 10,
  uploads_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_media_tokens_event_id ON public.media_upload_tokens(event_id);
CREATE INDEX idx_media_tokens_token ON public.media_upload_tokens(token);
CREATE UNIQUE INDEX idx_media_tokens_event_token ON public.media_upload_tokens(event_id, token);

ALTER TABLE public.media_upload_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view their tokens"
  ON public.media_upload_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_upload_tokens.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can manage their tokens"
  ON public.media_upload_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_upload_tokens.event_id
      AND events.user_id = auth.uid()
    )
  );

-- 3. Create media_gallery_settings table
CREATE TABLE public.media_gallery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT true,
  max_uploads_per_guest INTEGER DEFAULT 10,
  allow_photos BOOLEAN DEFAULT true,
  allow_videos BOOLEAN DEFAULT true,
  max_photo_size_mb INTEGER DEFAULT 10,
  max_video_size_mb INTEGER DEFAULT 100,
  max_video_duration_seconds INTEGER DEFAULT 60,
  album_expires_at TIMESTAMPTZ,
  slideshow_interval_seconds INTEGER DEFAULT 5,
  show_captions BOOLEAN DEFAULT true,
  watermark_enabled BOOLEAN DEFAULT false,
  watermark_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_gallery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gallery settings"
  ON public.media_gallery_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own gallery settings"
  ON public.media_gallery_settings FOR ALL
  USING (auth.uid() = user_id);

-- 4. Create storage bucket for media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-media',
  'event-media',
  false,
  104857600,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
);

-- 5. Storage RLS policies
CREATE POLICY "Event owners can view their media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'event-media' AND
    EXISTS (
      SELECT 1 FROM public.media_uploads mu
      JOIN public.events e ON e.id = mu.event_id
      WHERE mu.file_url = storage.objects.name
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete their media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-media' AND
    EXISTS (
      SELECT 1 FROM public.media_uploads mu
      JOIN public.events e ON e.id = mu.event_id
      WHERE mu.file_url = storage.objects.name
      AND e.user_id = auth.uid()
    )
  );

-- 6. Add media tracking columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS media_photos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_videos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_total_size_mb NUMERIC(10,2) DEFAULT 0;

CREATE INDEX idx_events_media_counts ON public.events(user_id, media_photos_count, media_videos_count);

-- 7. Database function: Generate upload token
CREATE OR REPLACE FUNCTION public.generate_media_upload_token(
  _event_id UUID,
  _validity_days INTEGER DEFAULT 30,
  _max_uploads INTEGER DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token TEXT;
  _expires_at TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to event';
  END IF;

  _token := encode(gen_random_bytes(32), 'base64');
  _token := replace(replace(_token, '/', '_'), '+', '-');
  
  _expires_at := now() + (_validity_days || ' days')::interval;

  INSERT INTO public.media_upload_tokens (
    event_id, token, expires_at, max_uploads
  )
  VALUES (_event_id, _token, _expires_at, _max_uploads)
  ON CONFLICT (event_id, token) DO UPDATE
  SET expires_at = EXCLUDED.expires_at,
      max_uploads = EXCLUDED.max_uploads;

  RETURN _token;
END;
$$;

-- 8. Database function: Validate token
CREATE OR REPLACE FUNCTION public.validate_media_token(
  _event_id UUID,
  _token TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  can_upload BOOLEAN,
  remaining_uploads INTEGER,
  require_approval BOOLEAN,
  allow_photos BOOLEAN,
  allow_videos BOOLEAN,
  max_photo_size_mb INTEGER,
  max_video_size_mb INTEGER,
  event_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_record RECORD;
  _settings_record RECORD;
  _event_record RECORD;
BEGIN
  SELECT * INTO _token_record
  FROM public.media_upload_tokens
  WHERE event_id = _event_id
    AND token = _token
    AND is_active = true
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, false, false, false, 0, 0, ''::TEXT;
    RETURN;
  END IF;

  SELECT * INTO _event_record
  FROM public.events
  WHERE id = _event_id;

  SELECT * INTO _settings_record
  FROM public.media_gallery_settings
  WHERE event_id = _event_id;

  RETURN QUERY SELECT
    true,
    (_token_record.uploads_used < _token_record.max_uploads),
    (_token_record.max_uploads - _token_record.uploads_used),
    COALESCE(_settings_record.require_approval, true),
    COALESCE(_settings_record.allow_photos, true),
    COALESCE(_settings_record.allow_videos, true),
    COALESCE(_settings_record.max_photo_size_mb, 10),
    COALESCE(_settings_record.max_video_size_mb, 100),
    _event_record.name;
END;
$$;

-- 9. Database function: Get public gallery media
CREATE OR REPLACE FUNCTION public.get_public_gallery_media(
  _event_slug TEXT
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  caption TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  cloudflare_stream_uid TEXT,
  created_at TIMESTAMPTZ,
  width INTEGER,
  height INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mu.id,
    mu.type,
    mu.caption,
    mu.file_url,
    mu.thumbnail_url,
    mu.cloudflare_stream_uid,
    mu.created_at,
    mu.width,
    mu.height
  FROM public.media_uploads mu
  JOIN public.events e ON e.id = mu.event_id
  LEFT JOIN public.media_gallery_settings mgs ON mgs.event_id = e.id
  WHERE e.slug = _event_slug
    AND mu.status = 'approved'
    AND COALESCE(mgs.is_active, true) = true
  ORDER BY mu.created_at DESC;
$$;

-- 10. Enable realtime for media_uploads
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_uploads;