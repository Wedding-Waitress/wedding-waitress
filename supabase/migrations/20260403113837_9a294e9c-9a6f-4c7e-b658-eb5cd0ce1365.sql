ALTER TABLE public.full_seating_chart_settings
  ADD COLUMN is_bold boolean NOT NULL DEFAULT true,
  ADD COLUMN is_italic boolean NOT NULL DEFAULT false,
  ADD COLUMN is_underline boolean NOT NULL DEFAULT false;