-- Add thumbnail_url to invitation_gallery_images
ALTER TABLE public.invitation_gallery_images
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Create invitation-gallery storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invitation-gallery', 'invitation-gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for invitation-gallery: public read, admin-only write/delete
DROP POLICY IF EXISTS "Public can read invitation-gallery" ON storage.objects;
CREATE POLICY "Public can read invitation-gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'invitation-gallery');

DROP POLICY IF EXISTS "Admins can insert invitation-gallery" ON storage.objects;
CREATE POLICY "Admins can insert invitation-gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invitation-gallery' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update invitation-gallery" ON storage.objects;
CREATE POLICY "Admins can update invitation-gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invitation-gallery' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete invitation-gallery" ON storage.objects;
CREATE POLICY "Admins can delete invitation-gallery"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invitation-gallery' AND public.has_role(auth.uid(), 'admin'::app_role));

-- RLS for invitation_gallery_images: public read (already), admin-only write/delete
ALTER TABLE public.invitation_gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view invitation gallery" ON public.invitation_gallery_images;
CREATE POLICY "Public can view invitation gallery"
ON public.invitation_gallery_images FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert invitation gallery" ON public.invitation_gallery_images;
CREATE POLICY "Admins can insert invitation gallery"
ON public.invitation_gallery_images FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update invitation gallery" ON public.invitation_gallery_images;
CREATE POLICY "Admins can update invitation gallery"
ON public.invitation_gallery_images FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete invitation gallery" ON public.invitation_gallery_images;
CREATE POLICY "Admins can delete invitation gallery"
ON public.invitation_gallery_images FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));