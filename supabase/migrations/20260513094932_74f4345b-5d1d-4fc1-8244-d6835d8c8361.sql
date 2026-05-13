
DO $$
DECLARE
  mapping jsonb := '{
    "Asian Wedding": "Asian",
    "Classic / Elegant": "Elegant",
    "Indian Wedding": "Cultural",
    "Luxury / Gold": "Glamour",
    "Modern / Minimal": "Minimal",
    "Persian Wedding": "Cultural",
    "Rustic": "Vintage"
  }'::jsonb;
  k text;
  v text;
  src_id uuid;
  dst_id uuid;
BEGIN
  FOR k, v IN SELECT * FROM jsonb_each_text(mapping) LOOP
    SELECT id INTO src_id FROM public.signage_categories WHERE name = k;
    SELECT id INTO dst_id FROM public.signage_categories WHERE name = v;
    IF src_id IS NULL THEN CONTINUE; END IF;
    IF dst_id IS NULL THEN CONTINUE; END IF;

    -- Move join rows, skipping any image already linked to dst (UNIQUE image_id).
    UPDATE public.signage_image_categories sic
       SET category_id = dst_id
     WHERE sic.category_id = src_id
       AND NOT EXISTS (
         SELECT 1 FROM public.signage_image_categories x
         WHERE x.image_id = sic.image_id AND x.category_id = dst_id
       );

    -- Drop any leftover duplicates still pointing at src.
    DELETE FROM public.signage_image_categories WHERE category_id = src_id;

    -- Sync legacy text column on the gallery images.
    UPDATE public.signage_gallery_images
       SET category = v
     WHERE category = k;

    -- Remove the obsolete category.
    DELETE FROM public.signage_categories WHERE id = src_id;
  END LOOP;
END $$;
