-- ============================================
-- Add visibility and sort_index to media_items
-- ============================================
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' 
CHECK (visibility IN ('public', 'hidden'));

ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS sort_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_media_items_visibility ON public.media_items(visibility);
CREATE INDEX IF NOT EXISTS idx_media_items_sort_index ON public.media_items(sort_index);

-- ============================================
-- Add visibility to guestbook_messages
-- ============================================
ALTER TABLE public.guestbook_messages 
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public' 
CHECK (visibility IN ('public', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_guestbook_visibility ON public.guestbook_messages(visibility);

-- ============================================
-- Extend media_gallery_settings
-- ============================================
ALTER TABLE public.media_gallery_settings 
ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gallery_password TEXT,
ADD COLUMN IF NOT EXISTS show_download_buttons BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6D28D9',
ADD COLUMN IF NOT EXISTS album_title TEXT,
ADD COLUMN IF NOT EXISTS welcome_text TEXT,
ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS watermark_text TEXT;

-- ============================================
-- Update RPC: get_gallery_media (respect visibility)
-- ============================================
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
    AND mi.visibility = 'public'
    AND mgs.is_active = true
  ORDER BY 
    CASE WHEN mi.sort_index IS NULL THEN 1 ELSE 0 END,
    mi.sort_index ASC,
    mi.created_at DESC;
$$;

-- ============================================
-- Update RPC: get_guestbook_messages (respect visibility)
-- ============================================
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
    AND gm.visibility = 'public'
    AND mgs.is_active = true
  ORDER BY gm.created_at DESC;
$$;