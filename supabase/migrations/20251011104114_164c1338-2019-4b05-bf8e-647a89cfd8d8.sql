-- Add new columns to galleries table for visibility controls
ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS show_footer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_public_gallery boolean NOT NULL DEFAULT true;

-- Update RLS policies for public access to respect show_public_gallery

-- Drop existing public select policy on galleries (if exists)
DROP POLICY IF EXISTS "galleries public active read" ON public.galleries;

-- Create new public select policy for galleries
CREATE POLICY "galleries_public_read" ON public.galleries
  FOR SELECT
  USING (is_active = true AND show_public_gallery = true);

-- Drop existing public select policy on media_uploads (if exists)
DROP POLICY IF EXISTS "Public can view approved media" ON public.media_uploads;

-- Create new public select policy for media_uploads
CREATE POLICY "media_public_approved_read" ON public.media_uploads
  FOR SELECT
  USING (
    status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.galleries g 
      WHERE g.id = media_uploads.gallery_id 
        AND g.is_active = true 
        AND g.show_public_gallery = true
    )
  );

-- Note: Owner access policies remain unchanged