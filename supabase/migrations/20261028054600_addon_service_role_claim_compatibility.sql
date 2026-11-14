-- Accept service-role identity from current PostgREST claims as well as the legacy setting.
-- Existing service-role-only ACLs and all payment/ownership/catalogue guards remain enforced.
CREATE OR REPLACE FUNCTION public.fulfill_additional_event_purchase_gst(_user_id uuid, _stripe_session_id text, _stripe_price_id text, _amount integer, _currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  existing_purchase public.additional_event_purchases%ROWTYPE;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _stripe_price_id IS DISTINCT FROM 'price_1UFTqL5GzTmqOxGKgPWVdCwr'
     OR _amount IS DISTINCT FROM 10890
     OR upper(_currency) IS DISTINCT FROM 'AUD' THEN
    RAISE EXCEPTION 'additional-event payment does not match the approved AUD catalogue';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.plan_id IN (
        '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,
        '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,
        'cd10f207-2109-4546-a635-0baa68ba8213'::uuid
      )
      AND us.status IN ('active', 'trialing', 'grace_period')
      AND coalesce(us.is_read_only, false) = false
      AND (us.expires_at IS NULL OR us.expires_at >= clock_timestamp())
  ) THEN
    RAISE EXCEPTION 'a current Essential, Premium or Ultimate plan is required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_stripe_session_id, 0));
  SELECT * INTO existing_purchase
  FROM public.additional_event_purchases p
  WHERE p.stripe_session_id = _stripe_session_id;
  IF FOUND THEN
    IF existing_purchase.user_id IS DISTINCT FROM _user_id
       OR existing_purchase.stripe_price_id IS DISTINCT FROM _stripe_price_id
       OR existing_purchase.amount IS DISTINCT FROM _amount
       OR upper(existing_purchase.currency) IS DISTINCT FROM 'AUD' THEN
      RAISE EXCEPTION 'stripe session is already associated with a different purchase';
    END IF;
  ELSE
    INSERT INTO public.additional_event_purchases (
      user_id, event_id, stripe_session_id, stripe_price_id, amount, currency, status
    ) VALUES (
      _user_id, NULL, _stripe_session_id, _stripe_price_id, _amount, 'AUD', 'paid'
    );
  END IF;

  RETURN jsonb_build_object(
    'already_fulfilled', existing_purchase.id IS NOT NULL,
    'additional_events', 1,
    'amount', 10890,
    'currency', 'AUD'
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fulfill_communication_credit_topup_gst(_user_id uuid, _event_id uuid, _stripe_session_id text, _stripe_payment_id text, _stripe_price_id text, _amount_paid numeric, _pack_key text, _credits integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  expected_credits integer;
  expected_amount numeric;
  plan_allowance integer;
  existing_purchase public.rsvp_invite_purchases%ROWTYPE;
  resulting_total integer;
  resulting_used integer;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;

  IF _pack_key = 'credits_10' THEN
    expected_credits := 10;
    expected_amount := 11;
  ELSIF _pack_key = 'credits_100' THEN
    expected_credits := 100;
    expected_amount := 53.90;
  ELSE
    RAISE EXCEPTION 'invalid communication credit pack';
  END IF;

  IF _stripe_price_id IS DISTINCT FROM (CASE _pack_key
    WHEN 'credits_10' THEN 'price_1UFTqt5GzTmqOxGKhwwnh4Wj'
    WHEN 'credits_100' THEN 'price_1UFTr55GzTmqOxGKsh0sjgjK' END) THEN
    RAISE EXCEPTION 'communication price does not match the live catalogue';
  END IF;
  IF _credits IS DISTINCT FROM expected_credits
     OR _amount_paid IS DISTINCT FROM expected_amount THEN
    RAISE EXCEPTION 'communication credit pack amount does not match the approved catalogue';
  END IF;
  IF _stripe_session_id IS NULL OR btrim(_stripe_session_id) = ''
     OR _stripe_price_id IS NULL OR btrim(_stripe_price_id) = '' THEN
    RAISE EXCEPTION 'stripe session and price ids are required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = _event_id AND e.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT CASE us.plan_id
    WHEN '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid THEN 150
    WHEN '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid THEN 250
    WHEN 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid THEN 450
    ELSE NULL
  END INTO plan_allowance
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id
    AND us.status IN ('active', 'trialing', 'grace_period')
    AND coalesce(us.is_read_only, false) = false
    AND (us.expires_at IS NULL OR us.expires_at >= clock_timestamp())
    AND us.plan_id IN (
      '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,
      '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,
      'cd10f207-2109-4546-a635-0baa68ba8213'::uuid
    )
  ORDER BY us.created_at DESC
  LIMIT 1;
  IF plan_allowance IS NULL THEN
    RAISE EXCEPTION 'an active Essential, Premium or Ultimate plan is required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_stripe_session_id, 0));
  SELECT * INTO existing_purchase
  FROM public.rsvp_invite_purchases p
  WHERE p.stripe_session_id = _stripe_session_id;

  IF FOUND THEN
    IF existing_purchase.user_id IS DISTINCT FROM _user_id
       OR existing_purchase.event_id IS DISTINCT FROM _event_id
       OR existing_purchase.purchase_type IS DISTINCT FROM 'communication_topup'
       OR existing_purchase.status IS DISTINCT FROM 'completed'
       OR existing_purchase.amount_paid IS DISTINCT FROM expected_amount
       OR existing_purchase.guest_tier_label IS DISTINCT FROM
          ('Email & SMS Top-up +' || expected_credits::text || ' credits')
       OR (existing_purchase.stripe_price_id IS NOT NULL
           AND existing_purchase.stripe_price_id IS DISTINCT FROM _stripe_price_id) THEN
      RAISE EXCEPTION 'stripe session is already associated with a different purchase';
    END IF;

    UPDATE public.rsvp_invite_purchases
    SET stripe_price_id = coalesce(stripe_price_id, _stripe_price_id),
        stripe_payment_id = coalesce(stripe_payment_id, _stripe_payment_id)
    WHERE id = existing_purchase.id;
  ELSE
    INSERT INTO public.rsvp_invite_purchases (
      user_id, event_id, amount_paid, guest_tier_label,
      stripe_session_id, stripe_payment_id, stripe_price_id,
      status, purchase_type, purchased_limit, overage_blocks,
      guest_count_at_purchase
    ) VALUES (
      _user_id, _event_id, expected_amount,
      'Email & SMS Top-up +' || expected_credits::text || ' credits',
      _stripe_session_id, _stripe_payment_id, _stripe_price_id,
      'completed', 'communication_topup', NULL, 0, NULL
    );

    INSERT INTO public.sms_credits (user_id, event_id, total, used, last_topup_at)
    VALUES (_user_id, _event_id, plan_allowance + expected_credits, 0, now())
    ON CONFLICT (user_id, event_id) DO UPDATE
      SET total = greatest(public.sms_credits.total, plan_allowance) + expected_credits,
          last_topup_at = now(),
          updated_at = now();
  END IF;

  SELECT c.total, c.used INTO resulting_total, resulting_used
  FROM public.sms_credits c
  WHERE c.user_id = _user_id AND c.event_id = _event_id;

  RETURN jsonb_build_object(
    'already_fulfilled', existing_purchase.id IS NOT NULL,
    'pack_key', _pack_key,
    'credits_added', expected_credits,
    'amount_paid', expected_amount,
    'total', resulting_total,
    'used', resulting_used,
    'remaining', greatest(resulting_total - resulting_used, 0)
  );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.fulfill_guest_capacity_topup_gst(_user_id uuid, _event_id uuid, _stripe_session_id text, _stripe_payment_id text, _amount_paid numeric, _blocks integer, _guest_count_at_purchase integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  base_capacity integer;
  purchased_blocks integer;
  resulting_capacity integer;
  existing_purchase public.rsvp_invite_purchases%ROWTYPE;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _stripe_session_id IS NULL OR btrim(_stripe_session_id) = '' THEN
    RAISE EXCEPTION 'stripe session id is required';
  END IF;
  IF _blocks IS NULL OR _blocks < 1 OR _blocks > 100 THEN
    RAISE EXCEPTION 'capacity must be 1 to 100 whole blocks';
  END IF;
  IF _amount_paid IS DISTINCT FROM (_blocks * 11)::numeric THEN
    RAISE EXCEPTION 'amount does not match A$11 GST-inclusive per block';
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
    AND coalesce(us.is_read_only, false) = false
    AND (us.expires_at IS NULL OR us.expires_at >= clock_timestamp())
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
$function$
;

