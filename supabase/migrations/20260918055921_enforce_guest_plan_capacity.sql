-- Enforce the account plan's authoritative guest entitlement at every write
-- boundary used by My Events, Tables and Guest List. Existing rows are not
-- rewritten; the guards apply to future mutations only.

CREATE OR REPLACE FUNCTION private.resolve_event_guest_entitlement(
  p_owner_id uuid,
  p_event_id uuid DEFAULT NULL
)
RETURNS TABLE (
  plan_name text,
  base_guest_limit integer,
  purchased_guest_capacity integer,
  total_guest_limit integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH current_plan AS (
    SELECT sp.name, sp.guest_limit::integer
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_owner_id
      AND us.status IN ('active', 'trial', 'trialing', 'grace_period')
      AND coalesce(us.is_read_only, false) = false
      AND (us.expires_at IS NULL OR us.expires_at >= now())
      AND sp.guest_limit IS NOT NULL
      AND sp.guest_limit > 0
    ORDER BY us.created_at DESC
    LIMIT 1
  ), purchased AS (
    SELECT coalesce(sum(p.overage_blocks), 0)::integer * 10 AS guest_capacity
    FROM public.rsvp_invite_purchases p
    WHERE p_event_id IS NOT NULL
      AND p.event_id = p_event_id
      AND p.user_id = p_owner_id
      AND p.status = 'completed'
      AND p.purchase_type IN ('rsvp_overage', 'guest_capacity_topup')
  )
  SELECT current_plan.name,
         current_plan.guest_limit,
         purchased.guest_capacity,
         current_plan.guest_limit + purchased.guest_capacity
  FROM current_plan
  CROSS JOIN purchased
$$;

REVOKE ALL ON FUNCTION private.resolve_event_guest_entitlement(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.resolve_event_guest_entitlement(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION private.guard_event_guest_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entitlement record;
  current_guests integer;
  current_seats integer;
BEGIN
  IF private.is_platform_owner(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('guest-capacity:' || NEW.id::text, 0)
  );

  SELECT * INTO entitlement
  FROM private.resolve_event_guest_entitlement(NEW.user_id, NEW.id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WW_GUEST_PLAN_INACTIVE'
      USING ERRCODE = '42501',
            DETAIL = 'A current plan with a guest entitlement is required.';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.guest_limit IS DISTINCT FROM OLD.guest_limit)
     AND (NEW.guest_limit IS NULL OR NEW.guest_limit < 1
          OR NEW.guest_limit > entitlement.total_guest_limit) THEN
    RAISE EXCEPTION 'WW_EVENT_GUEST_LIMIT_EXCEEDED'
      USING ERRCODE = '23514',
            DETAIL = format(
              '%s permits up to %s guests for this event.',
              entitlement.plan_name,
              entitlement.total_guest_limit
            );
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.ceremony_guest_limit IS DISTINCT FROM OLD.ceremony_guest_limit)
     AND NEW.ceremony_guest_limit IS NOT NULL
     AND (NEW.ceremony_guest_limit < 1
          OR NEW.ceremony_guest_limit > entitlement.total_guest_limit) THEN
    RAISE EXCEPTION 'WW_EVENT_GUEST_LIMIT_EXCEEDED'
      USING ERRCODE = '23514',
            DETAIL = format(
              '%s permits up to %s guests for this event.',
              entitlement.plan_name,
              entitlement.total_guest_limit
            );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.guest_limit IS DISTINCT FROM OLD.guest_limit THEN
    SELECT count(*)::integer INTO current_guests
    FROM public.guests g
    WHERE g.event_id = NEW.id;

    SELECT coalesce(sum(t.limit_seats), 0)::integer INTO current_seats
    FROM public.tables t
    WHERE t.event_id = NEW.id;

    IF current_guests > NEW.guest_limit THEN
      RAISE EXCEPTION 'WW_EVENT_LIMIT_BELOW_GUEST_COUNT'
        USING ERRCODE = '23514',
              DETAIL = format('The event already has %s guests.', current_guests);
    END IF;
    IF current_seats > NEW.guest_limit THEN
      RAISE EXCEPTION 'WW_EVENT_LIMIT_BELOW_TABLE_CAPACITY'
        USING ERRCODE = '23514',
              DETAIL = format('The event already has %s table seats.', current_seats);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_event_guest_limit()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_event_guest_entitlement ON public.events;
CREATE TRIGGER enforce_event_guest_entitlement
BEFORE INSERT OR UPDATE OF guest_limit, ceremony_guest_limit, user_id
ON public.events
FOR EACH ROW EXECUTE FUNCTION private.guard_event_guest_limit();

CREATE OR REPLACE FUNCTION private.guard_table_guest_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
  configured_event_limit integer;
  entitled_limit integer;
  allowed_limit integer;
  proposed_seats integer;
BEGIN
  SELECT e.user_id, e.guest_limit
  INTO owner_id, configured_event_limit
  FROM public.events e
  WHERE e.id = NEW.event_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = '23503';
  END IF;
  IF private.is_platform_owner(owner_id) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('guest-capacity:' || NEW.event_id::text, 0)
  );

  SELECT total_guest_limit INTO entitled_limit
  FROM private.resolve_event_guest_entitlement(owner_id, NEW.event_id);
  IF entitled_limit IS NULL THEN
    RAISE EXCEPTION 'WW_GUEST_PLAN_INACTIVE'
      USING ERRCODE = '42501';
  END IF;

  allowed_limit := CASE
    WHEN configured_event_limit > 0 THEN least(configured_event_limit, entitled_limit)
    ELSE entitled_limit
  END;

  SELECT coalesce(sum(t.limit_seats), 0)::integer + NEW.limit_seats
  INTO proposed_seats
  FROM public.tables t
  WHERE t.event_id = NEW.event_id
    AND t.id IS DISTINCT FROM NEW.id;

  IF proposed_seats > allowed_limit THEN
    RAISE EXCEPTION 'WW_TABLE_CAPACITY_EXCEEDED'
      USING ERRCODE = '23514',
            DETAIL = format(
              'Combined table capacity would be %s; this event allows %s guests.',
              proposed_seats,
              allowed_limit
            );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_table_guest_capacity()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_table_guest_capacity ON public.tables;
CREATE TRIGGER enforce_table_guest_capacity
BEFORE INSERT OR UPDATE OF event_id, limit_seats, user_id
ON public.tables
FOR EACH ROW EXECUTE FUNCTION private.guard_table_guest_capacity();

CREATE OR REPLACE FUNCTION public.enforce_paid_plan_guest_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
  configured_event_limit integer;
  entitled_limit integer;
  allowed_limit integer;
  current_guest_count integer;
BEGIN
  SELECT e.user_id, e.guest_limit
  INTO owner_id, configured_event_limit
  FROM public.events e
  WHERE e.id = NEW.event_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = '23503';
  END IF;
  IF private.is_platform_owner(owner_id) THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('guest-capacity:' || NEW.event_id::text, 0)
  );

  SELECT total_guest_limit INTO entitled_limit
  FROM private.resolve_event_guest_entitlement(owner_id, NEW.event_id);
  IF entitled_limit IS NULL THEN
    RAISE EXCEPTION 'WW_GUEST_PLAN_INACTIVE'
      USING ERRCODE = '42501';
  END IF;

  allowed_limit := CASE
    WHEN configured_event_limit > 0 THEN least(configured_event_limit, entitled_limit)
    ELSE entitled_limit
  END;

  IF TG_OP = 'UPDATE' THEN
    SELECT count(*)::integer INTO current_guest_count
    FROM public.guests g
    WHERE g.event_id = NEW.event_id
      AND g.id IS DISTINCT FROM OLD.id;
  ELSE
    SELECT count(*)::integer INTO current_guest_count
    FROM public.guests g
    WHERE g.event_id = NEW.event_id;
  END IF;

  IF current_guest_count >= allowed_limit THEN
    RAISE EXCEPTION 'WW_GUEST_LIMIT_REACHED'
      USING ERRCODE = '23514',
            DETAIL = format(
              'This event allows %s guests. Upgrade the plan or add guest capacity.',
              allowed_limit
            );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_paid_plan_guest_capacity()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guests_enforce_paid_plan_capacity ON public.guests;
CREATE TRIGGER guests_enforce_paid_plan_capacity
BEFORE INSERT OR UPDATE OF event_id
ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_plan_guest_capacity();

CREATE OR REPLACE FUNCTION public.get_event_guest_capacity(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  event_row public.events%ROWTYPE;
  entitlement record;
  existing_guest_count integer;
  table_seat_capacity integer;
BEGIN
  IF actor IS NULL OR NOT public.can_access_event(actor, p_event_id) THEN
    RAISE EXCEPTION 'Event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO event_row FROM public.events e WHERE e.id = p_event_id;
  IF private.is_platform_owner(event_row.user_id) THEN
    RETURN jsonb_build_object(
      'plan_name', 'Platform Owner',
      'base_guest_limit', NULL,
      'purchased_guest_capacity', 0,
      'total_guest_limit', NULL,
      'event_guest_limit', event_row.guest_limit,
      'allowed_guest_limit', NULL,
      'existing_guest_count', NULL,
      'table_seat_capacity', NULL,
      'minimum_guest_limit', NULL,
      'is_platform_owner', true
    );
  END IF;

  SELECT * INTO entitlement
  FROM private.resolve_event_guest_entitlement(event_row.user_id, p_event_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WW_GUEST_PLAN_INACTIVE' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::integer INTO existing_guest_count
  FROM public.guests g
  WHERE g.event_id = p_event_id;

  SELECT coalesce(sum(t.limit_seats), 0)::integer INTO table_seat_capacity
  FROM public.tables t
  WHERE t.event_id = p_event_id;

  RETURN jsonb_build_object(
    'plan_name', entitlement.plan_name,
    'base_guest_limit', entitlement.base_guest_limit,
    'purchased_guest_capacity', entitlement.purchased_guest_capacity,
    'total_guest_limit', entitlement.total_guest_limit,
    'event_guest_limit', event_row.guest_limit,
    'allowed_guest_limit', CASE
      WHEN event_row.guest_limit > 0
        THEN least(event_row.guest_limit, entitlement.total_guest_limit)
      ELSE entitlement.total_guest_limit
    END,
    'existing_guest_count', existing_guest_count,
    'table_seat_capacity', table_seat_capacity,
    'minimum_guest_limit', greatest(existing_guest_count, table_seat_capacity),
    'is_platform_owner', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_guest_capacity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_guest_capacity(uuid) TO authenticated, service_role;
