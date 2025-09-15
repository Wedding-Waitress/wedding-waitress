-- Add family_group column to guests table
ALTER TABLE public.guests 
ADD COLUMN family_group text;