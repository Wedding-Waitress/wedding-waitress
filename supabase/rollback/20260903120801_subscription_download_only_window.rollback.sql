-- Emergency rollback for 20260903120801_subscription_download_only_window.sql.
-- Production was confirmed to have zero user_subscriptions before rollout.
-- This rollback refuses to remove the added column if rows now exist, avoiding
-- loss of subscription lifecycle data created after rollout.

BEGIN;

DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'event_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name <> 'events'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS guard_expired_event_mutation ON public.%I',
      target.table_name
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS guard_expired_event_mutation ON public.events;
DROP TRIGGER IF EXISTS set_subscription_download_window ON public.user_subscriptions;

DROP FUNCTION IF EXISTS public.guard_expired_event_mutation();
DROP FUNCTION IF EXISTS public.subscription_allows_event_edit(uuid);
DROP FUNCTION IF EXISTS public.extend_starter_trial_once();
DROP FUNCTION IF EXISTS public.refresh_my_subscription_lifecycle();
DROP FUNCTION IF EXISTS public.set_subscription_download_window();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_subscriptions) THEN
    RAISE EXCEPTION
      'Rollback stopped: user_subscriptions now contains rows; preserve download_only_ends_at and restore deliberately.';
  END IF;

  ALTER TABLE public.user_subscriptions
    DROP COLUMN IF EXISTS download_only_ends_at;
END;
$$;

COMMIT;
