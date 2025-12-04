-- Drop the old constraint that limits seats to 30
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_limit_seats_check;

-- Add new constraint allowing up to 124 seats for long tables
ALTER TABLE public.tables ADD CONSTRAINT tables_limit_seats_check 
CHECK (((limit_seats > 0) AND (limit_seats <= 124)));

-- Add comment for documentation
COMMENT ON CONSTRAINT tables_limit_seats_check ON public.tables IS 'Table seat limit: 1-20 for round/square tables, 20-124 for long tables';