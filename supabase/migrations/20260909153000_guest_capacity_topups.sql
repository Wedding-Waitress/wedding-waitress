-- Paid-plan guest capacity add-ons: A$10 per whole block of 10 spaces.
-- Historical RSVP overage rows remain valid capacity purchases.

ALTER TABLE public.rsvp_invite_purchases
  DROP CONSTRAINT IF EXISTS rsvp_invite_purchases_purchase_type_check;
ALTER TABLE public.rsvp_invite_purchases
  ADD CONSTRAINT rsvp_invite_purchases_purchase_type_check
  CHECK (purchase_type IN ('rsvp_tier', 'rsvp_overage', 'guest_capacity_topup', 'communication_topup', 'sms_topup'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_rsvp_invite_purchases_stripe_session
  ON public.rsvp_invite_purchases (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_guest_capacity_topup(
  _user_id uuid,
  _event_id uuid,
  _stripe_session_id text,
  _stripe_payment_id text,
  _amount_paid numeric,
  _blocks integer,
  _guest_count_at_purchase integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_capacity integer;
  purchased_blocks integer;
  resulting_capacity integer;
  existing_purchase public.rsvp_invite_purchases%ROWTYPE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _stripe_session_id IS NULL OR btrim(_stripe_session_id) = '' THEN
    RAISE EXCEPTION 'stripe session id is required';
  END IF;
  IF _blocks IS NULL OR _blocks < 1 OR _blocks > 100 THEN
    RAISE EXCEPTION 'capacity must be 1 to 100 whole blocks';
  END IF;
  IF _amount_paid IS DISTINCT FROM (_blocks * 10)::numeric THEN
    RAISE EXCEPTION 'amount does not match A$10 per block';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT sp.guest_limit
  INTO base_capacity
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing', 'grace_period')
    AND us.plan_id IN (
      '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,
      '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,
      'cd10f207-2109-4546-a635-0baa68ba8213'::uuid
    )
  ORDER BY us.created_at DESC
  LIMIT 1;
  IF base_capacity IS NULL OR base_capacity < 1 THEN
    RAISE EXCEPTION 'an active Essential, Premium or Ultimate plan is required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_stripe_session_id, 0));
  SELECT * INTO existing_purchase
  FROM public.rsvp_invite_purchases p
  WHERE p.stripe_session_id = _stripe_session_id;

  IF FOUND THEN
    IF existing_purchase.user_id IS DISTINCT FROM _user_id
       OR existing_purchase.event_id IS DISTINCT FROM _event_id
       OR existing_purchase.purchase_type IS DISTINCT FROM 'guest_capacity_topup'
       OR existing_purchase.overage_blocks IS DISTINCT FROM _blocks THEN
      RAISE EXCEPTION 'stripe session is already associated with a different purchase';
    END IF;
  ELSE
    INSERT INTO public.rsvp_invite_purchases (
      user_id, event_id, amount_paid, guest_tier_label,
      stripe_session_id, stripe_payment_id, status, purchase_type,
      purchased_limit, overage_blocks, guest_count_at_purchase
    ) VALUES (
      _user_id, _event_id, _amount_paid,
      'Guest Capacity +' || (_blocks * 10)::text || ' spaces',
      _stripe_session_id, _stripe_payment_id, 'completed', 'guest_capacity_topup',
      NULL, _blocks, _guest_count_at_purchase
    );
  END IF;

  SELECT coalesce(sum(p.overage_blocks), 0)::integer
  INTO purchased_blocks
  FROM public.rsvp_invite_purchases p
  WHERE p.event_id = _event_id
    AND p.user_id = _user_id
    AND p.status = 'completed'
    AND p.purchase_type IN ('rsvp_overage', 'guest_capacity_topup');

  resulting_capacity := base_capacity + purchased_blocks * 10;
  UPDATE public.events
  SET guest_limit = greatest(coalesce(guest_limit, 0), resulting_capacity)
  WHERE id = _event_id AND user_id = _user_id;

  RETURN jsonb_build_object(
    'already_fulfilled', existing_purchase.id IS NOT NULL,
    'blocks_added', _blocks,
    'additional_spaces', _blocks * 10,
    'base_capacity', base_capacity,
    'purchased_blocks', purchased_blocks,
    'resulting_capacity', resulting_capacity
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_guest_capacity_topup(uuid, uuid, text, text, numeric, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_guest_capacity_topup(uuid, uuid, text, text, numeric, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_paid_plan_guest_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
  base_capacity integer;
  purchased_blocks integer;
  current_guest_count integer;
BEGIN
  SELECT e.user_id INTO owner_id FROM public.events e WHERE e.id = NEW.event_id;
  IF owner_id IS NULL THEN RETURN NEW; END IF;
  IF private.is_platform_owner(owner_id) THEN RETURN NEW; END IF;

  SELECT sp.guest_limit
  INTO base_capacity
  FROM public.user_subscriptions us
  JOIN public.subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = owner_id
    AND us.status IN ('active', 'trialing', 'grace_period')
  ORDER BY us.created_at DESC
  LIMIT 1;
  IF base_capacity IS NULL OR base_capacity < 1 THEN
    SELECT NULLIF(e.guest_limit, 0) INTO base_capacity
    FROM public.events e WHERE e.id = NEW.event_id;
  END IF;
  IF base_capacity IS NULL THEN RETURN NEW; END IF;

  SELECT coalesce(sum(p.overage_blocks), 0)::integer
  INTO purchased_blocks
  FROM public.rsvp_invite_purchases p
  WHERE p.event_id = NEW.event_id
    AND p.user_id = owner_id
    AND p.status = 'completed'
    AND p.purchase_type IN ('rsvp_overage', 'guest_capacity_topup');
  SELECT count(*)::integer INTO current_guest_count
  FROM public.guests g WHERE g.event_id = NEW.event_id;

  IF current_guest_count >= base_capacity + purchased_blocks * 10 THEN
    RAISE EXCEPTION 'The event guest capacity has been reached'
      USING ERRCODE = '23514',
            DETAIL = 'Purchase another block of 10 guest spaces or remove an existing guest.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_paid_plan_guest_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guests_enforce_paid_plan_capacity ON public.guests;
CREATE TRIGGER guests_enforce_paid_plan_capacity
BEFORE INSERT ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_plan_guest_capacity();

COMMENT ON FUNCTION public.fulfill_guest_capacity_topup(uuid, uuid, text, text, numeric, integer, integer) IS
  'Service-only, idempotent fulfillment for paid A$10 blocks of 10 event guest spaces.';
