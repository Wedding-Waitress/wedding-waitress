-- Adds a distinct 30-day download-only entitlement without changing the
-- existing retention/grace_period_ends_at policy. This migration is forward-only.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS download_only_ends_at timestamptz;

UPDATE public.user_subscriptions
SET download_only_ends_at = expires_at + interval '30 days'
WHERE download_only_ends_at IS NULL;

ALTER TABLE public.user_subscriptions
  ALTER COLUMN download_only_ends_at SET DEFAULT (now() + interval '30 days');

CREATE OR REPLACE FUNCTION public.set_subscription_download_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.download_only_ends_at IS NULL THEN
    NEW.download_only_ends_at := NEW.expires_at + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_subscription_download_window ON public.user_subscriptions;
CREATE TRIGGER set_subscription_download_window
BEFORE INSERT OR UPDATE OF expires_at, download_only_ends_at ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_subscription_download_window();

CREATE OR REPLACE FUNCTION public.refresh_my_subscription_lifecycle()
RETURNS TABLE(status text, is_read_only boolean, expires_at timestamptz, download_only_ends_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid := auth.uid();
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  UPDATE public.user_subscriptions us
  SET status = CASE
        WHEN now() <= us.expires_at THEN us.status
        WHEN now() <= coalesce(us.download_only_ends_at, us.expires_at + interval '30 days') THEN 'grace_period'
        ELSE 'expired'
      END,
      is_read_only = CASE WHEN now() > us.expires_at THEN true ELSE us.is_read_only END,
      download_only_ends_at = coalesce(us.download_only_ends_at, us.expires_at + interval '30 days'),
      updated_at = now()
  WHERE us.user_id = owner_id;

  RETURN QUERY
  SELECT us.status, us.is_read_only, us.expires_at, us.download_only_ends_at
  FROM public.user_subscriptions us WHERE us.user_id = owner_id LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_subscription_lifecycle() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_my_subscription_lifecycle() TO authenticated;

-- Prevent clients from directly restoring their own subscription. Payment and
-- admin functions use the service role and remain unaffected.
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE OR REPLACE FUNCTION public.extend_starter_trial_once()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_expiry timestamptz;
BEGIN
  UPDATE public.user_subscriptions us
  SET expires_at = greatest(us.expires_at, now()) + interval '7 days',
      trial_extended = true,
      status = 'active',
      is_read_only = false,
      updated_at = now()
  FROM public.subscription_plans sp
  WHERE us.user_id = auth.uid()
    AND sp.id = us.plan_id
    AND sp.name = 'Starter'
    AND us.trial_extended = false
  RETURNING us.expires_at INTO new_expiry;
  IF new_expiry IS NULL THEN RAISE EXCEPTION 'Trial extension is not available'; END IF;
  RETURN new_expiry;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_starter_trial_once() FROM public;
GRANT EXECUTE ON FUNCTION public.extend_starter_trial_once() TO authenticated;

CREATE OR REPLACE FUNCTION public.subscription_allows_event_edit(owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
    WHERE us.user_id = owner_id
      AND us.status = 'active'
      AND us.is_read_only = false
      AND now() <= us.expires_at
  );
$$;

CREATE OR REPLACE FUNCTION public.guard_expired_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE payload jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
DECLARE owner_id uuid;
DECLARE event_uuid uuid;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END; END IF;
  IF TG_TABLE_NAME = 'events' THEN
    owner_id := nullif(payload->>'user_id', '')::uuid;
  ELSE
    event_uuid := nullif(payload->>'event_id', '')::uuid;
    IF event_uuid IS NOT NULL THEN SELECT e.user_id INTO owner_id FROM public.events e WHERE e.id = event_uuid; END IF;
  END IF;
  IF owner_id IS NOT NULL AND NOT public.subscription_allows_event_edit(owner_id) THEN
    RAISE EXCEPTION 'Paid planning access has ended. This account is download-only.' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_expired_event_mutation ON public.events;
CREATE TRIGGER guard_expired_event_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_expired_event_mutation();

DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'event_id' AND t.table_type = 'BASE TABLE' AND c.table_name <> 'events'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS guard_expired_event_mutation ON public.%I', target.table_name);
    EXECUTE format('CREATE TRIGGER guard_expired_event_mutation BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_expired_event_mutation()', target.table_name);
  END LOOP;
END;
$$;
