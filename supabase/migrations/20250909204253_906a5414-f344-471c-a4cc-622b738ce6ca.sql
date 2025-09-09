-- Add new venue columns to events table
ALTER TABLE public.events 
ADD COLUMN venue_name text,
ADD COLUMN venue_address text,
ADD COLUMN venue_place_id text,
ADD COLUMN venue_lat double precision,
ADD COLUMN venue_lng double precision;

-- Update existing venue data to venue_name if venue exists
UPDATE public.events 
SET venue_name = venue 
WHERE venue IS NOT NULL AND venue_name IS NULL;