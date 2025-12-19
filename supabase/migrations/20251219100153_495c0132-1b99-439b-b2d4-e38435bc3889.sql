-- Add ceremony fields to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_enabled boolean DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_name text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_venue text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_venue_address text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_guest_limit integer;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_start_time time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_finish_time time;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ceremony_rsvp_deadline date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS reception_enabled boolean DEFAULT true;