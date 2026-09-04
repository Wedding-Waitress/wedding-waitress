-- Prepared recovery script for 20260902071302_guided_event_setup.sql.
-- DO NOT execute during activation. This removes only objects introduced by
-- that migration. Run in a controlled maintenance window if rollback is approved.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE public.event_budget_settings
  DROP CONSTRAINT IF EXISTS event_budget_settings_range_state_check,
  DROP COLUMN IF EXISTS planned_budget_range,
  DROP COLUMN IF EXISTS planned_budget_kind;

DROP INDEX IF EXISTS public.events_onboarding_draft_id_uidx;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_onboarding_draft_owner_fkey,
  DROP COLUMN IF EXISTS setup_details,
  DROP COLUMN IF EXISTS onboarding_draft_id;

DROP TABLE IF EXISTS public.onboarding_drafts;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_id_user_id_key;

NOTIFY pgrst, 'reload schema';
COMMIT;
