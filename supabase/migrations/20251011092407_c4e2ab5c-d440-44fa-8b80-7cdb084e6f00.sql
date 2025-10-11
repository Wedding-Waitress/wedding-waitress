-- =========================================
-- GALLERIES + MEDIA UPLOADS ENHANCEMENT
-- =========================================

-- 1) Create galleries table
CREATE TABLE IF NOT EXISTS public.galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  event_id UUID NULL REFERENCES public.events(id) ON DELETE SET NULL,
  event_type TEXT NULL,
  event_date DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_galleries_owner ON public.galleries(owner_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON public.galleries(slug);

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;

-- 2) Create gallery_settings table
CREATE TABLE IF NOT EXISTS public.gallery_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  max_uploads_per_guest INTEGER NOT NULL DEFAULT 10,
  allow_photos BOOLEAN NOT NULL DEFAULT true,
  allow_videos BOOLEAN NOT NULL DEFAULT true,
  max_photo_size_mb INTEGER NOT NULL DEFAULT 10,
  max_video_size_mb INTEGER NOT NULL DEFAULT 100,
  slideshow_interval_seconds INTEGER NOT NULL DEFAULT 5,
  show_captions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gallery_id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_settings_gallery ON public.gallery_settings(gallery_id);

ALTER TABLE public.gallery_settings ENABLE ROW LEVEL SECURITY;

-- 3) Add gallery_id to media_uploads
ALTER TABLE public.media_uploads 
ADD COLUMN IF NOT EXISTS gallery_id UUID NULL REFERENCES public.galleries(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_media_uploads_gallery ON public.media_uploads(gallery_id);

-- Make event_id nullable for gallery-only media
ALTER TABLE public.media_uploads 
ALTER COLUMN event_id DROP NOT NULL;

-- 4) Add gallery_id to media_upload_tokens
ALTER TABLE public.media_upload_tokens
ADD COLUMN IF NOT EXISTS gallery_id UUID NULL REFERENCES public.galleries(id) ON DELETE CASCADE;

ALTER TABLE public.media_upload_tokens
ALTER COLUMN event_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_upload_tokens_gallery ON public.media_upload_tokens(gallery_id);

-- 5) RLS Policies for galleries
DROP POLICY IF EXISTS "Users can view their own galleries" ON public.galleries;
CREATE POLICY "Users can view their own galleries" ON public.galleries
  FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create galleries" ON public.galleries;
CREATE POLICY "Users can create galleries" ON public.galleries
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their galleries" ON public.galleries;
CREATE POLICY "Users can update their galleries" ON public.galleries
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their galleries" ON public.galleries;
CREATE POLICY "Users can delete their galleries" ON public.galleries
  FOR DELETE
  USING (auth.uid() = owner_id);

-- 6) RLS Policies for gallery_settings
DROP POLICY IF EXISTS "Gallery owners can view settings" ON public.gallery_settings;
CREATE POLICY "Gallery owners can view settings" ON public.gallery_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = gallery_settings.gallery_id
      AND galleries.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gallery owners can manage settings" ON public.gallery_settings;
CREATE POLICY "Gallery owners can manage settings" ON public.gallery_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = gallery_settings.gallery_id
      AND galleries.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = gallery_settings.gallery_id
      AND galleries.owner_id = auth.uid()
    )
  );

-- 7) Update RLS Policies for media_uploads (gallery-based)
DROP POLICY IF EXISTS "Gallery owners can select media" ON public.media_uploads;
CREATE POLICY "Gallery owners can select media" ON public.media_uploads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = media_uploads.gallery_id
      AND galleries.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gallery owners can insert media" ON public.media_uploads;
CREATE POLICY "Gallery owners can insert media" ON public.media_uploads
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = media_uploads.gallery_id
      AND galleries.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gallery owners can update media" ON public.media_uploads;
CREATE POLICY "Gallery owners can update media" ON public.media_uploads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = media_uploads.gallery_id
      AND galleries.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = media_uploads.gallery_id
      AND galleries.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Gallery owners can delete media" ON public.media_uploads;
CREATE POLICY "Gallery owners can delete media" ON public.media_uploads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries
      WHERE galleries.id = media_uploads.gallery_id
      AND galleries.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = media_uploads.event_id
      AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view approved media" ON public.media_uploads;
CREATE POLICY "Public can view approved media" ON public.media_uploads
  FOR SELECT
  USING (
    status = 'approved'
    AND (
      EXISTS (
        SELECT 1 FROM public.galleries
        WHERE galleries.id = media_uploads.gallery_id
        AND galleries.is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM public.events
        WHERE events.id = media_uploads.event_id
        AND events.qr_apply_to_live_view = true
      )
    )
  );

-- 8) Create generate_gallery_slug function
CREATE OR REPLACE FUNCTION public.generate_gallery_slug(_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _slug TEXT;
  _counter INTEGER := 0;
  _final_slug TEXT;
BEGIN
  _slug := lower(trim(_title));
  _slug := regexp_replace(_slug, '[^a-z0-9\s-]', '', 'g');
  _slug := regexp_replace(_slug, '\s+', '-', 'g');
  _slug := regexp_replace(_slug, '-+', '-', 'g');
  _slug := trim(_slug, '-');
  
  IF _slug = '' THEN
    _slug := 'gallery';
  END IF;
  
  _final_slug := _slug;
  
  WHILE EXISTS(SELECT 1 FROM galleries WHERE slug = _final_slug) LOOP
    _counter := _counter + 1;
    _final_slug := _slug || '-' || _counter;
  END LOOP;
  
  RETURN _final_slug;
END;
$$;

-- 9) Create get_public_gallery_data function
CREATE OR REPLACE FUNCTION public.get_public_gallery_data(_gallery_slug TEXT)
RETURNS TABLE(
  gallery_id UUID,
  gallery_title TEXT,
  event_date DATE,
  is_active BOOLEAN,
  media_id UUID,
  post_type TEXT,
  file_url TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  cloudflare_stream_uid TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    g.id,
    g.title,
    g.event_date,
    g.is_active,
    mu.id,
    mu.post_type,
    mu.file_url,
    mu.caption,
    mu.thumbnail_url,
    mu.cloudflare_stream_uid,
    mu.created_at
  FROM public.galleries g
  LEFT JOIN public.media_uploads mu ON mu.gallery_id = g.id
  WHERE g.slug = _gallery_slug
    AND g.is_active = true
    AND (mu.status = 'approved' OR mu.id IS NULL)
  ORDER BY mu.created_at DESC;
$$;

-- 10) Create trigger for galleries updated_at
CREATE OR REPLACE FUNCTION public.update_galleries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_galleries_updated_at ON public.galleries;
CREATE TRIGGER trigger_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_galleries_updated_at();

DROP TRIGGER IF EXISTS trigger_gallery_settings_updated_at ON public.gallery_settings;
CREATE TRIGGER trigger_gallery_settings_updated_at
  BEFORE UPDATE ON public.gallery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();