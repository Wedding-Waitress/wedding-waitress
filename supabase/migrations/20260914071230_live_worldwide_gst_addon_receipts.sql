-- New GST fulfillment variants; historical functions and payment rows remain intact.
-- Apply only with separately approved backend deployment; this file does not lift launch holds.
-- Preserve historical funded credits, and recognise only exact new GST-inclusive SKUs.
CREATE OR REPLACE FUNCTION private.promotion_funded_credits(p_user uuid,p_event uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(sum(CASE
 WHEN guest_tier_label='Email & SMS Top-up +100 credits'
 AND (amount_paid=49 OR (amount_paid=53.90 AND stripe_price_id='price_1UFTr55GzTmqOxGKsh0sjgjK')) THEN 100
 WHEN guest_tier_label='Email & SMS Top-up +10 credits'
 AND (amount_paid=10 OR (amount_paid=11 AND stripe_price_id='price_1UFTqt5GzTmqOxGKhwwnh4Wj')) THEN 10
 ELSE 0 END),0)::integer
 FROM public.rsvp_invite_purchases WHERE user_id=p_user AND event_id=p_event AND purchase_type='communication_topup'
 AND status='completed' AND stripe_session_id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION private.promotion_funded_credits(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fulfill_communication_credit_topup_gst(
  _user_id uuid,
  _event_id uuid,
  _stripe_session_id text,
  _stripe_payment_id text,
  _stripe_price_id text,
  _amount_paid numeric,
  _pack_key text,
  _credits integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_credits integer;
  expected_amount numeric;
  plan_allowance integer;
  existing_purchase public.rsvp_invite_purchases%ROWTYPE;
  resulting_total integer;
  resulting_used integer;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
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
$$;
CREATE OR REPLACE FUNCTION public.fulfill_guest_capacity_topup_gst(
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
$$;
CREATE OR REPLACE FUNCTION public.fulfill_additional_event_purchase_gst(
  _user_id uuid,
  _stripe_session_id text,
  _stripe_price_id text,
  _amount integer,
  _currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing_purchase public.additional_event_purchases%ROWTYPE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
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
$$;
REVOKE ALL ON FUNCTION public.fulfill_communication_credit_topup_gst(uuid,uuid,text,text,text,numeric,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_communication_credit_topup_gst(uuid,uuid,text,text,text,numeric,text,integer) TO service_role;
REVOKE ALL ON FUNCTION public.fulfill_guest_capacity_topup_gst(uuid,uuid,text,text,numeric,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_guest_capacity_topup_gst(uuid,uuid,text,text,numeric,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.fulfill_additional_event_purchase_gst(uuid,text,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_additional_event_purchase_gst(uuid,text,text,integer,text) TO service_role;

ALTER TABLE public.access_extension_purchases
  ADD COLUMN gst_cents integer,
  ADD COLUMN total_paid_cents integer,
  ADD CONSTRAINT access_extension_gst_receipt CHECK (
    (gst_cents IS NULL AND total_paid_cents IS NULL)
    OR (gst_cents IS NOT NULL AND total_paid_cents IS NOT NULL AND gst_cents = months * 200 AND total_paid_cents = amount_cents + gst_cents)
  );

CREATE FUNCTION public.fulfill_access_extension_gst(
 _stripe_session_id text,_user_id uuid,_months integer,_amount_cents integer,
 _currency text,_payment_status text,_tax_cents integer,_total_cents integer
) RETURNS TABLE(result text,previous_expires_at timestamptz,new_expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE prior public.access_extension_purchases%ROWTYPE;
BEGIN
 IF coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' THEN
   RAISE EXCEPTION 'service role required' USING ERRCODE='42501';
 END IF;
 IF _months IS NULL OR _months NOT BETWEEN 1 AND 45454
   OR _amount_cents IS DISTINCT FROM _months*2000 OR _tax_cents IS DISTINCT FROM _months*200
   OR _total_cents IS DISTINCT FROM _months*2200 THEN RAISE EXCEPTION 'invalid GST extension amount'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_stripe_session_id,0));
 SELECT * INTO prior FROM public.access_extension_purchases WHERE stripe_session_id=_stripe_session_id;
 IF FOUND AND (prior.gst_cents IS DISTINCT FROM _tax_cents OR prior.total_paid_cents IS DISTINCT FROM _total_cents) THEN
   RAISE EXCEPTION 'extension receipt already has different tax details';
 END IF;
 RETURN QUERY SELECT * FROM public.fulfill_access_extension(_stripe_session_id,_user_id,_months,_amount_cents,_currency,_payment_status);
 UPDATE public.access_extension_purchases SET gst_cents=_tax_cents,total_paid_cents=_total_cents
 WHERE stripe_session_id=_stripe_session_id AND user_id=_user_id;
END; $$;
REVOKE ALL ON FUNCTION public.fulfill_access_extension_gst(text,uuid,integer,integer,text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_access_extension_gst(text,uuid,integer,integer,text,text,integer,integer) TO service_role;

-- Preserve redemption, trial and replay guards while updating catalogue binding.
CREATE OR REPLACE FUNCTION public.bind_promotion_checkout(p_reservation uuid,p_session text,p_customer text,p_product text,p_coupon text,p_live boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r private.promotion_redemptions; deadline timestamptz; expected_product text;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_session IS NULL OR p_session !~ '^cs_[A-Za-z0-9_]+$' OR p_customer IS NULL OR p_customer !~ '^cus_[A-Za-z0-9]+$'
 OR p_coupon IS NULL OR btrim(p_coupon)='' OR p_live IS NULL THEN RAISE EXCEPTION 'Provider binding required'; END IF;
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND OR r.state<>'reserved' THEN RAISE EXCEPTION 'Reserved checkout required'; END IF;
 IF EXISTS(SELECT 1 FROM private.promotion_expired_attempts WHERE stripe_session_id=p_session) THEN RAISE EXCEPTION 'Expired checkout cannot be rebound'; END IF;
 expected_product:=CASE r.plan_key WHEN 'essential' THEN 'ww_live_20260914_v2_essential' WHEN 'premium' THEN 'ww_live_20260914_v2_premium' WHEN 'unlimited' THEN 'ww_live_20260914_v2_unlimited' END;
 IF p_product IS DISTINCT FROM expected_product THEN RAISE EXCEPTION 'Approved package product required'; END IF;
 SELECT trial_ends_at INTO deadline FROM private.account_trial_history WHERE account_user_id=r.account_user_id;
 IF deadline IS NULL OR NOT isfinite(deadline) THEN RAISE EXCEPTION 'Original trial registry required'; END IF;
 IF r.stripe_session_id IS NOT NULL THEN
  IF r.stripe_session_id IS DISTINCT FROM p_session OR r.stripe_customer_id IS DISTINCT FROM p_customer
  OR r.stripe_product_id IS DISTINCT FROM p_product OR r.stripe_coupon_id IS DISTINCT FROM p_coupon OR r.livemode IS DISTINCT FROM p_live THEN
   RAISE EXCEPTION 'Reservation is already bound to different checkout evidence'; END IF;
 ELSE
  UPDATE private.promotion_redemptions SET stripe_session_id=p_session,stripe_customer_id=p_customer,stripe_product_id=p_product,
   stripe_coupon_id=p_coupon,livemode=p_live,original_trial_ends_at=deadline WHERE id=r.id RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('id',r.id,'stripe_session_id',r.stripe_session_id,'original_trial_ends_at',r.original_trial_ends_at);
END $$;
REVOKE ALL ON FUNCTION public.bind_promotion_checkout(uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bind_promotion_checkout(uuid,text,text,text,text,boolean) TO service_role;
