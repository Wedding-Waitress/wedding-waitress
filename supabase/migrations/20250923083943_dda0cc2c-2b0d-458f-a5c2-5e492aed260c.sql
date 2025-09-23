-- Add marker color columns to qr_code_settings table
ALTER TABLE public.qr_code_settings 
ADD COLUMN marker_border_color text DEFAULT '#000000',
ADD COLUMN marker_center_color text DEFAULT '#000000';