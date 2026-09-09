-- Restore the immediately preceding four-currency constraints/catalogue.
-- This does not convert any stored amounts.

ALTER TABLE public.event_budget_settings
  DROP CONSTRAINT IF EXISTS event_budget_settings_currency_check;
ALTER TABLE public.event_budget_settings
  ADD CONSTRAINT event_budget_settings_currency_check
  CHECK (currency IN ('AUD', 'USD', 'GBP', 'EUR')) NOT VALID;
ALTER TABLE public.event_budget_settings
  VALIDATE CONSTRAINT event_budget_settings_currency_check;

ALTER TABLE public.additional_event_purchases
  DROP CONSTRAINT IF EXISTS additional_event_purchases_currency_check;

CREATE OR REPLACE FUNCTION public.fulfill_additional_event_purchase(
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
  expected_amount integer;
  expected_currency text;
  existing_purchase public.additional_event_purchases%ROWTYPE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  SELECT x.amount, x.currency
  INTO expected_amount, expected_currency
  FROM (VALUES
    ('price_1TUoZ15GzTmqOxGKDRmvofDh', 9900, 'AUD'),
    ('price_1TUoZT5GzTmqOxGK92kQqFuO', 7499, 'USD'),
    ('price_1TUobn5GzTmqOxGKQSvVqcFY', 6499, 'GBP'),
    ('price_1TUocE5GzTmqOxGK9qKIXoHT', 6999, 'EUR')
  ) AS x(price_id, amount, currency)
  WHERE x.price_id = _stripe_price_id;
  IF expected_amount IS NULL
     OR _amount IS DISTINCT FROM expected_amount
     OR upper(_currency) IS DISTINCT FROM expected_currency THEN
    RAISE EXCEPTION 'additional-event payment does not match the approved catalogue';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions us
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
       OR upper(existing_purchase.currency) IS DISTINCT FROM expected_currency THEN
      RAISE EXCEPTION 'stripe session is already associated with a different purchase';
    END IF;
  ELSE
    INSERT INTO public.additional_event_purchases (
      user_id, event_id, stripe_session_id, stripe_price_id, amount, currency, status
    ) VALUES (
      _user_id, NULL, _stripe_session_id, _stripe_price_id, _amount, expected_currency, 'paid'
    );
  END IF;

  RETURN jsonb_build_object(
    'already_fulfilled', existing_purchase.id IS NOT NULL,
    'additional_events', 1,
    'amount', expected_amount,
    'currency', expected_currency
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_additional_event_purchase(uuid, text, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_additional_event_purchase(uuid, text, text, integer, text)
  TO service_role;
