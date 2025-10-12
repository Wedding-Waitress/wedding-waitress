-- Enable RLS on media_uploads (if not already enabled)
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- Allow anon users to insert media when gallery is active
DROP POLICY IF EXISTS "media_insert_guest_active" ON public.media_uploads;
CREATE POLICY "media_insert_guest_active" ON public.media_uploads
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = media_uploads.gallery_id 
    AND g.is_active = true
    AND g.show_public_gallery = true
  )
);

-- Allow anon users to view approved media from active galleries
DROP POLICY IF EXISTS "media_select_guest_approved" ON public.media_uploads;
CREATE POLICY "media_select_guest_approved" ON public.media_uploads
FOR SELECT
TO anon
USING (
  status = 'approved' 
  AND EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = media_uploads.gallery_id 
    AND g.is_active = true
    AND g.show_public_gallery = true
  )
);