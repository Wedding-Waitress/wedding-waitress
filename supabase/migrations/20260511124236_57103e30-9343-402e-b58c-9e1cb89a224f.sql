-- Create signage_gallery_images table
CREATE TABLE public.signage_gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signage_gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signage gallery images"
  ON public.signage_gallery_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert signage gallery images"
  ON public.signage_gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update signage gallery images"
  ON public.signage_gallery_images FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete signage gallery images"
  ON public.signage_gallery_images FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create public storage bucket for signage gallery
INSERT INTO storage.buckets (id, name, public)
VALUES ('signage-gallery', 'signage-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read signage gallery"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'signage-gallery');

CREATE POLICY "Admins upload signage gallery"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signage-gallery' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update signage gallery"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'signage-gallery' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete signage gallery"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'signage-gallery' AND has_role(auth.uid(), 'admin'::app_role));