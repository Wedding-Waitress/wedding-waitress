-- Add display_order column to guests table for custom ordering within tables
ALTER TABLE public.guests 
ADD COLUMN display_order integer;