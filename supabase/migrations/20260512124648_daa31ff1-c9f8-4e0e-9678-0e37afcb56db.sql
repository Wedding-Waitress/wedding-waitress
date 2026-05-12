
-- Signage categories tables (mirror invitation_categories / invitation_image_categories)
CREATE TABLE IF NOT EXISTS public.signage_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signage_image_categories (
  image_id uuid NOT NULL REFERENCES public.signage_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.signage_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, category_id)
);

ALTER TABLE public.signage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signage_image_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signage categories"
  ON public.signage_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert signage categories"
  ON public.signage_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update signage categories"
  ON public.signage_categories FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete signage categories"
  ON public.signage_categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view signage image categories"
  ON public.signage_image_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert signage image categories"
  ON public.signage_image_categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete signage image categories"
  ON public.signage_image_categories FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Backfill: seed categories from existing signage_gallery_images.category
INSERT INTO public.signage_categories (name, slug)
SELECT DISTINCT category,
  lower(regexp_replace(regexp_replace(category, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
FROM public.signage_gallery_images
WHERE category IS NOT NULL AND length(trim(category)) > 0
ON CONFLICT (name) DO NOTHING;

-- Backfill junction
INSERT INTO public.signage_image_categories (image_id, category_id)
SELECT i.id, c.id
FROM public.signage_gallery_images i
JOIN public.signage_categories c ON c.name = i.category
ON CONFLICT DO NOTHING;
