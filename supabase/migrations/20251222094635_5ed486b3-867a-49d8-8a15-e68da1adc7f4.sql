-- Create table for admin-managed place card gallery images
CREATE TABLE public.place_card_gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.place_card_gallery_images ENABLE ROW LEVEL SECURITY;

-- Everyone can view gallery images (they're curated by admin)
CREATE POLICY "Anyone can view gallery images"
ON public.place_card_gallery_images
FOR SELECT
USING (true);

-- Only admins can manage gallery images
CREATE POLICY "Admins can manage gallery images"
ON public.place_card_gallery_images
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-card-gallery', 'place-card-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the gallery bucket
CREATE POLICY "Anyone can view gallery images storage"
ON storage.objects
FOR SELECT
USING (bucket_id = 'place-card-gallery');

CREATE POLICY "Admins can upload gallery images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'place-card-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gallery images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'place-card-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gallery images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'place-card-gallery' AND public.has_role(auth.uid(), 'admin'));