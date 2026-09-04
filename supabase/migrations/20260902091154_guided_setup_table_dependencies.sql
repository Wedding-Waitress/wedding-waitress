-- Minimum semantic table fields required by Guided Event Setup Page 9.
-- Existing tables are preserved and classified as standard tables.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS table_purpose text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS head_seating_order jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Complete a safely interrupted/partially applied equivalent migration without
-- changing any existing non-null semantic value.
UPDATE public.tables
SET table_purpose = 'standard'
WHERE table_purpose IS NULL;

UPDATE public.tables
SET head_seating_order = '[]'::jsonb
WHERE head_seating_order IS NULL;

ALTER TABLE public.tables
  ALTER COLUMN table_purpose SET DEFAULT 'standard',
  ALTER COLUMN table_purpose SET NOT NULL,
  ALTER COLUMN head_seating_order SET DEFAULT '[]'::jsonb,
  ALTER COLUMN head_seating_order SET NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_table_purpose_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_table_purpose_check
      CHECK (table_purpose IN ('standard', 'head')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_head_geometry_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_head_geometry_check
      CHECK (table_purpose <> 'head' OR table_type = 'long') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tables'::regclass
      AND conname = 'tables_head_seating_order_array_check'
  ) THEN
    ALTER TABLE public.tables
      ADD CONSTRAINT tables_head_seating_order_array_check
      CHECK (jsonb_typeof(head_seating_order) = 'array') NOT VALID;
  END IF;
END
$constraints$;

ALTER TABLE public.tables
  VALIDATE CONSTRAINT tables_table_purpose_check,
  VALIDATE CONSTRAINT tables_head_geometry_check,
  VALIDATE CONSTRAINT tables_head_seating_order_array_check;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_one_head_per_event
  ON public.tables (event_id)
  WHERE table_purpose = 'head';

COMMENT ON COLUMN public.tables.table_purpose IS
  'Stable semantic purpose. Head tables are never inferred from their visible name.';
COMMENT ON COLUMN public.tables.head_seating_order IS
  'Authoritative left-to-right order as viewed by guests.';

NOTIFY pgrst, 'reload schema';
COMMIT;
