
-- Enforce single-category per gallery image at the database level
ALTER TABLE public.invitation_image_categories
  DROP CONSTRAINT IF EXISTS invitation_image_categories_image_id_unique;
ALTER TABLE public.invitation_image_categories
  ADD CONSTRAINT invitation_image_categories_image_id_unique UNIQUE (image_id);

ALTER TABLE public.signage_image_categories
  DROP CONSTRAINT IF EXISTS signage_image_categories_image_id_unique;
ALTER TABLE public.signage_image_categories
  ADD CONSTRAINT signage_image_categories_image_id_unique UNIQUE (image_id);

-- Backfill legacy text `category` column from the join table (single source of truth)
UPDATE public.invitation_gallery_images g
SET category = COALESCE(c.name, 'Uncategorized')
FROM public.invitation_image_categories ic
LEFT JOIN public.invitation_categories c ON c.id = ic.category_id
WHERE ic.image_id = g.id
  AND g.category IS DISTINCT FROM COALESCE(c.name, 'Uncategorized');

UPDATE public.invitation_gallery_images g
SET category = 'Uncategorized'
WHERE NOT EXISTS (SELECT 1 FROM public.invitation_image_categories ic WHERE ic.image_id = g.id)
  AND COALESCE(g.category, '') <> 'Uncategorized';

UPDATE public.signage_gallery_images g
SET category = COALESCE(c.name, 'Uncategorized')
FROM public.signage_image_categories ic
LEFT JOIN public.signage_categories c ON c.id = ic.category_id
WHERE ic.image_id = g.id
  AND g.category IS DISTINCT FROM COALESCE(c.name, 'Uncategorized');

UPDATE public.signage_gallery_images g
SET category = 'Uncategorized'
WHERE NOT EXISTS (SELECT 1 FROM public.signage_image_categories ic WHERE ic.image_id = g.id)
  AND COALESCE(g.category, '') <> 'Uncategorized';
