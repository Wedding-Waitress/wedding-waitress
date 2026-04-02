ALTER TABLE public.dj_mc_items 
  ADD COLUMN IF NOT EXISTS is_bold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_underline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_section_header boolean NOT NULL DEFAULT false;