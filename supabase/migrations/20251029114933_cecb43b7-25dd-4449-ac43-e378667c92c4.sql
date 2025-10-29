-- =====================================================
-- Media Upload Backend Infrastructure
-- =====================================================
-- Creates storage buckets, tables, RLS policies, and RPC functions
-- for photo/video/audio/guestbook uploads tied to event galleries

-- =====================================================
-- 1. STORAGE BUCKETS
-- =====================================================

-- Create storage buckets for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('media-photos', 'media-photos', true, 26214400, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']),
  ('media-videos', 'media-videos', true, 314572800, ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']),
  ('media-audio', 'media-audio', true, 20971520, ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg']),
  ('media-thumbs', 'media-thumbs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS Policies: Public read, restricted write (only via signed URLs from Edge Functions)
CREATE POLICY "Public can read media-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-photos');

CREATE POLICY "Public can read media-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-videos');

CREATE POLICY "Public can read media-audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-audio');

CREATE POLICY "Public can read media-thumbs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-thumbs');

-- Service role can write (for Edge Functions with service_role key)
CREATE POLICY "Service role can write to media-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-photos' AND auth.role() = 'service_role');

CREATE POLICY "Service role can write to media-videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-videos' AND auth.role() = 'service_role');

CREATE POLICY "Service role can write to media-audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-audio' AND auth.role() = 'service_role');

CREATE POLICY "Service role can write to media-thumbs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media-thumbs' AND auth.role() = 'service_role');

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Table: media_items
-- Stores metadata for all media uploads (photos, videos, audio, guestbook text)
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id UUID NULL,
  
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'audio', 'guestbook_text')),
  storage_path TEXT NULL,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  
  duration_sec INTEGER NULL,
  width INTEGER NULL,
  height INTEGER NULL,
  filesize BIGINT NULL,
  
  caption TEXT NULL,
  
  cloudflare_stream_uid TEXT NULL,
  
  thumbnail_path TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_items_event_id ON public.media_items(event_id);
CREATE INDEX idx_media_items_status ON public.media_items(status);
CREATE INDEX idx_media_items_type ON public.media_items(type);
CREATE INDEX idx_media_items_created_at ON public.media_items(created_at DESC);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view their media"
  ON public.media_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_items.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can manage their media"
  ON public.media_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_items.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view approved media for public events"
  ON public.media_items FOR SELECT
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.media_gallery_settings mgs ON mgs.event_id = e.id
      WHERE e.id = media_items.event_id
      AND mgs.is_active = true
    )
  );

CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table: guestbook_messages
CREATE TABLE public.guestbook_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id UUID NULL,
  
  message TEXT NOT NULL,
  guest_name TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guestbook_event_id ON public.guestbook_messages(event_id);
CREATE INDEX idx_guestbook_created_at ON public.guestbook_messages(created_at DESC);

ALTER TABLE public.guestbook_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view their guestbook"
  ON public.guestbook_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guestbook_messages.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can delete messages"
  ON public.guestbook_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = guestbook_messages.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert guestbook messages"
  ON public.guestbook_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.media_gallery_settings mgs ON mgs.event_id = e.id
      WHERE e.id = guestbook_messages.event_id
      AND mgs.is_active = true
    )
  );

-- Table: upload_rate_limits
CREATE TABLE public.upload_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  event_slug TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(ip_address, event_slug)
);

CREATE INDEX idx_rate_limits_ip_slug ON public.upload_rate_limits(ip_address, event_slug);
CREATE INDEX idx_rate_limits_window ON public.upload_rate_limits(window_start);

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.upload_rate_limits
  WHERE window_start < now() - interval '1 hour';
$$;

-- =====================================================
-- 3. PUBLIC RPC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_gallery_media(_event_slug TEXT)
RETURNS TABLE (
  id UUID,
  type TEXT,
  storage_path TEXT,
  status TEXT,
  caption TEXT,
  thumbnail_path TEXT,
  cloudflare_stream_uid TEXT,
  width INTEGER,
  height INTEGER,
  duration_sec INTEGER,
  filesize BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mi.id,
    mi.type,
    mi.storage_path,
    mi.status,
    mi.caption,
    mi.thumbnail_path,
    mi.cloudflare_stream_uid,
    mi.width,
    mi.height,
    mi.duration_sec,
    mi.filesize,
    mi.created_at
  FROM public.media_items mi
  JOIN public.events e ON e.id = mi.event_id
  JOIN public.media_gallery_settings mgs ON mgs.event_id = e.id
  WHERE e.slug = _event_slug
    AND mi.status = 'ready'
    AND mgs.is_active = true
  ORDER BY mi.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_guestbook_messages(_event_slug TEXT)
RETURNS TABLE (
  id UUID,
  message TEXT,
  guest_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    gm.id,
    gm.message,
    gm.guest_name,
    gm.created_at
  FROM public.guestbook_messages gm
  JOIN public.events e ON e.id = gm.event_id
  JOIN public.media_gallery_settings mgs ON mgs.event_id = e.id
  WHERE e.slug = _event_slug
    AND mgs.is_active = true
  ORDER BY gm.created_at DESC;
$$;