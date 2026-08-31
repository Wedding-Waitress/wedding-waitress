-- Expand the Event Budget Planner base currency catalogue without changing
-- existing data, access policies, grants, triggers, or ownership enforcement.

ALTER TABLE IF EXISTS public.event_budget_settings
  ALTER COLUMN currency SET DEFAULT 'AUD';

ALTER TABLE IF EXISTS public.event_budget_settings
  DROP CONSTRAINT IF EXISTS event_budget_settings_currency_check;

DO $$
BEGIN
  IF to_regclass('public.event_budget_settings') IS NOT NULL THEN
    ALTER TABLE public.event_budget_settings
      ADD CONSTRAINT event_budget_settings_currency_check
      CHECK (currency IN ('AUD', 'USD', 'GBP', 'EUR'))
      NOT VALID;

    ALTER TABLE public.event_budget_settings
      VALIDATE CONSTRAINT event_budget_settings_currency_check;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
