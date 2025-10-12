-- Add thumbnail and poster URL columns to media_uploads for high-quality responsive images
ALTER TABLE public.media_uploads
ADD COLUMN IF NOT EXISTS thumb_512_url TEXT,
ADD COLUMN IF NOT EXISTS thumb_1280_url TEXT,
ADD COLUMN IF NOT EXISTS poster_url TEXT;

-- Add index for faster thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_media_uploads_thumbnail_cache 
ON public.media_uploads(gallery_id, status) 
WHERE thumb_512_url IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.media_uploads.thumb_512_url IS 'Path to 512px thumbnail for grid display';
COMMENT ON COLUMN public.media_uploads.thumb_1280_url IS 'Path to 1280px medium resolution for lightbox';
COMMENT ON COLUMN public.media_uploads.poster_url IS 'High-quality poster image URL for videos';