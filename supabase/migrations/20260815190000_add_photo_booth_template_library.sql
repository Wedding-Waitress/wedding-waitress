-- Persistent shared catalogue for organiser-managed Digital Photo Booth backgrounds.
CREATE TABLE IF NOT EXISTS public.photo_booth_background_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  colour text NOT NULL DEFAULT 'Multicolour',
  image_url text NOT NULL UNIQUE,
  thumbnail_url text NOT NULL,
  original_path text NOT NULL UNIQUE,
  thumbnail_path text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photo_booth_background_templates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.photo_booth_background_templates FROM anon, authenticated;
GRANT SELECT ON TABLE public.photo_booth_background_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.photo_booth_background_templates TO authenticated;

CREATE POLICY "Anyone can view photo booth background templates"
ON public.photo_booth_background_templates FOR SELECT
USING (true);

CREATE POLICY "Admins can insert photo booth background templates"
ON public.photo_booth_background_templates FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update photo booth background templates"
ON public.photo_booth_background_templates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete photo booth background templates"
ON public.photo_booth_background_templates FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photo-booth-template-library',
  'photo-booth-template-library',
  true,
  524288000,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public can read photo booth template library"
ON storage.objects FOR SELECT
USING (bucket_id = 'photo-booth-template-library');

CREATE POLICY "Admins can insert photo booth template library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'photo-booth-template-library'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update photo booth template library"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'photo-booth-template-library'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'photo-booth-template-library'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete photo booth template library"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'photo-booth-template-library'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS photo_booth_background_templates_sort_idx
ON public.photo_booth_background_templates (sort_order, name);
