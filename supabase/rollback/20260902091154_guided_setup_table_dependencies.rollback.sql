-- Prepared recovery script for 20260902091154_guided_setup_table_dependencies.sql.
-- Do not execute during activation. Preflight confirmed both columns and all
-- named constraints/indexes were absent before this migration.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DROP INDEX IF EXISTS public.uq_tables_one_head_per_event;

ALTER TABLE public.tables
  DROP CONSTRAINT IF EXISTS tables_head_seating_order_array_check,
  DROP CONSTRAINT IF EXISTS tables_head_geometry_check,
  DROP CONSTRAINT IF EXISTS tables_table_purpose_check,
  DROP COLUMN IF EXISTS head_seating_order,
  DROP COLUMN IF EXISTS table_purpose;

NOTIFY pgrst, 'reload schema';
COMMIT;
