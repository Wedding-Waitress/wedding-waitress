-- Add rsvp_deadline column to events table
ALTER TABLE public.events 
ADD COLUMN rsvp_deadline timestamptz NULL;

COMMENT ON COLUMN public.events.rsvp_deadline IS 'Deadline for guests to update their RSVP and details. NULL means no deadline (editing always allowed).';