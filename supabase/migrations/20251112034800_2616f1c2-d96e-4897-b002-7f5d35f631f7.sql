-- Fix the invalid default value for relation_mode
ALTER TABLE public.events 
ALTER COLUMN relation_mode SET DEFAULT 'two';

-- Update any existing records that might have 'wedding' or other invalid values
UPDATE public.events 
SET relation_mode = 'two' 
WHERE relation_mode NOT IN ('two', 'single', 'off') OR relation_mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.events.relation_mode IS 'Determines relationship display mode: "two" (wedding/engagement with two partners), "single" (single person event), "off" (hide relations). Must be one of these three values.';