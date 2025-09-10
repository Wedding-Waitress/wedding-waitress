-- Add table_no column for numeric table identification
ALTER TABLE public.tables 
ADD COLUMN IF NOT EXISTS table_no INTEGER;

-- Create unique index to prevent duplicate table numbers within the same event
-- Only applies to numeric tables (where table_no is not null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_event_table_no
ON public.tables(event_id, table_no)
WHERE table_no IS NOT NULL;