-- Add custom roles support to events table
ALTER TABLE public.events 
ADD COLUMN custom_roles jsonb DEFAULT '[]'::jsonb;