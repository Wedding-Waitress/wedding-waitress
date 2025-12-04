-- Add table_type column to tables table
ALTER TABLE public.tables
ADD COLUMN table_type text DEFAULT 'round';

-- Add comment for documentation
COMMENT ON COLUMN public.tables.table_type IS 'Type of table: round, square, or long';