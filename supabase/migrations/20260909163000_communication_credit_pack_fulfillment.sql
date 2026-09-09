-- Atomic, service-only fulfillment for the two approved pooled Email & SMS
-- credit packs. Stripe product/price/currency verification remains in the
-- verify-payment Edge Function; this database boundary independently enforces
-- the pack quantities and AUD amounts and prevents duplicate grants.

ALTER TABLE public.rsvp_invite_purchases
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

CREATE OR REPLACE FUNCTION public.fulfill_communication_credit_topup(
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
    expected_amount := 10;
  ELSIF _pack_key = 'credits_100' THEN
    expected_credits := 100;
    expected_amount := 49;
  ELSE
    RAISE EXCEPTION 'invalid communication credit pack';
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

REVOKE ALL ON FUNCTION public.fulfill_communication_credit_topup(
  uuid, uuid, text, text, text, numeric, text, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_communication_credit_topup(
  uuid, uuid, text, text, text, numeric, text, integer
) TO service_role;

COMMENT ON FUNCTION public.fulfill_communication_credit_topup(
  uuid, uuid, text, text, text, numeric, text, integer
) IS 'Service-only atomic fulfillment for exact A$10/10-credit and A$49/100-credit pooled Email & SMS packs.';
