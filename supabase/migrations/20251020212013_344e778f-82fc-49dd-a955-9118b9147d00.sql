-- Add background toggle columns to place_card_settings table
ALTER TABLE public.place_card_settings
ADD COLUMN IF NOT EXISTS background_behind_names BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS background_behind_table_seats BOOLEAN DEFAULT false;