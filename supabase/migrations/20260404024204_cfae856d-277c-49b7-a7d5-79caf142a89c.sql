ALTER TABLE public.dietary_chart_settings ADD COLUMN is_bold BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.dietary_chart_settings ADD COLUMN is_italic BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.dietary_chart_settings ADD COLUMN is_underline BOOLEAN NOT NULL DEFAULT false;