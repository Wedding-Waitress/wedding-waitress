ALTER TABLE public.dietary_chart_settings
  ADD COLUMN IF NOT EXISTS mobile_color TEXT NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS relationship_color TEXT NOT NULL DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS seat_number_color TEXT NOT NULL DEFAULT '#000000';

ALTER TABLE public.dietary_chart_settings
  ALTER COLUMN font_size SET DEFAULT 'standard';

UPDATE public.dietary_chart_settings
SET font_size = 'standard'
WHERE font_size = 'medium';
