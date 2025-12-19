-- Add venue phone and contact fields for ceremony and reception
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS ceremony_venue_phone text,
ADD COLUMN IF NOT EXISTS ceremony_venue_contact text,
ADD COLUMN IF NOT EXISTS venue_phone text,
ADD COLUMN IF NOT EXISTS venue_contact text;