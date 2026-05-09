ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS allow_guest_plus_ones boolean NOT NULL DEFAULT false;