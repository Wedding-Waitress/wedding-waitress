-- Add field to store "Apply to Live View" setting per event
ALTER TABLE public.events 
ADD COLUMN qr_apply_to_live_view boolean DEFAULT false;