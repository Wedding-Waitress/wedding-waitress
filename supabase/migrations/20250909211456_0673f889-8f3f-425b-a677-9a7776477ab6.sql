-- Add event_created column with default to today's date
ALTER TABLE public.events 
ADD COLUMN event_created date NOT NULL DEFAULT (now()::date);

-- Add expiry_date as a generated column (12 months after event_created)
ALTER TABLE public.events 
ADD COLUMN expiry_date date GENERATED ALWAYS AS (event_created + INTERVAL '12 months') STORED;