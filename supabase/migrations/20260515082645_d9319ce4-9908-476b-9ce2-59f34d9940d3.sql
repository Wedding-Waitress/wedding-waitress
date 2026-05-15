
-- Add thumbnail_url to place_card_gallery_images
ALTER TABLE public.place_card_gallery_images
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Categories table for place cards
CREATE TABLE IF NOT EXISTS public.place_card_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.place_card_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view place card categories"
  ON public.place_card_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage place card categories"
  ON public.place_card_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Join table for many-to-many image <-> category
CREATE TABLE IF NOT EXISTS public.place_card_image_categories (
  image_id uuid NOT NULL REFERENCES public.place_card_gallery_images(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.place_card_categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, category_id)
);

ALTER TABLE public.place_card_image_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view place card image categories"
  ON public.place_card_image_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage place card image categories"
  ON public.place_card_image_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Backfill: seed categories from existing legacy `category` text column
INSERT INTO public.place_card_categories (name, slug)
SELECT DISTINCT
  TRIM(category),
  LOWER(REGEXP_REPLACE(TRIM(category), '[^a-zA-Z0-9]+', '-', 'g'))
FROM public.place_card_gallery_images
WHERE category IS NOT NULL AND TRIM(category) <> ''
ON CONFLICT (name) DO NOTHING;

-- Seed join table from existing legacy assignments
INSERT INTO public.place_card_image_categories (image_id, category_id)
SELECT i.id, c.id
FROM public.place_card_gallery_images i
JOIN public.place_card_categories c ON c.name = TRIM(i.category)
WHERE i.category IS NOT NULL AND TRIM(i.category) <> ''
ON CONFLICT DO NOTHING;
