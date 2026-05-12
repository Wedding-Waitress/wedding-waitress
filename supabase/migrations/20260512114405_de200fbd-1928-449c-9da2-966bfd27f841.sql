
-- Categories table
CREATE TABLE IF NOT EXISTS public.invitation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invitation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invitation categories"
  ON public.invitation_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert invitation categories"
  ON public.invitation_categories FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invitation categories"
  ON public.invitation_categories FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invitation categories"
  ON public.invitation_categories FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Join table (image <-> category)
CREATE TABLE IF NOT EXISTS public.invitation_image_categories (
  image_id uuid NOT NULL REFERENCES public.invitation_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.invitation_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_iic_category ON public.invitation_image_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_iic_image ON public.invitation_image_categories(image_id);

ALTER TABLE public.invitation_image_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view image categories"
  ON public.invitation_image_categories FOR SELECT USING (true);

CREATE POLICY "Admins can insert image categories"
  ON public.invitation_image_categories FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete image categories"
  ON public.invitation_image_categories FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Backfill from legacy single-category column
INSERT INTO public.invitation_categories (name, slug)
SELECT DISTINCT category, lower(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'))
FROM public.invitation_gallery_images
WHERE category IS NOT NULL AND length(trim(category)) > 0
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.invitation_image_categories (image_id, category_id)
SELECT g.id, c.id
FROM public.invitation_gallery_images g
JOIN public.invitation_categories c ON c.name = g.category
ON CONFLICT DO NOTHING;
