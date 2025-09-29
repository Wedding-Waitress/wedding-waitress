-- Add rsvp_date column to guests table
ALTER TABLE public.guests 
ADD COLUMN rsvp_date DATE;