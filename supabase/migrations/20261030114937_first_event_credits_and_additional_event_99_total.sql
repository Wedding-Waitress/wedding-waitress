-- Prospective first-event-only included credits. Existing balances and purchases are retained.
BEGIN;
LOCK TABLE public.events,public.sms_credits IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE private.additional_event_checkout_quotes(
 stripe_session_id text PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,stripe_price_id text NOT NULL,
 catalogue_version text NOT NULL CHECK(catalogue_version='ww_additional_event_99_total_v1'),
 base_cents integer NOT NULL DEFAULT 9000 CHECK(base_cents=9000),tax_cents integer NOT NULL DEFAULT 900 CHECK(tax_cents=900),
 total_cents integer NOT NULL DEFAULT 9900 CHECK(total_cents=9900),currency text NOT NULL DEFAULT 'aud' CHECK(currency='aud'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE private.additional_event_checkout_quotes ENABLE ROW LEVEL SECURITY;
CREATE INDEX additional_event_checkout_quotes_user_idx ON private.additional_event_checkout_quotes(user_id);
REVOKE ALL ON private.additional_event_checkout_quotes FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.record_additional_event_checkout_quote(_user_id uuid,_stripe_session_id text,_stripe_price_id text,_catalogue_version text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE quote private.additional_event_checkout_quotes;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF _user_id IS NULL OR _stripe_session_id IS NULL OR _stripe_session_id!~'^cs_live_[A-Za-z0-9]+$'
 OR _stripe_price_id IS NULL OR _stripe_price_id!~'^price_[A-Za-z0-9]+$' OR _stripe_price_id='price_1UFTqL5GzTmqOxGKgPWVdCwr'
 OR _catalogue_version IS DISTINCT FROM 'ww_additional_event_99_total_v1' THEN RAISE EXCEPTION 'Invalid additional-event quote'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_stripe_session_id,0));
 INSERT INTO private.additional_event_checkout_quotes(stripe_session_id,user_id,stripe_price_id,catalogue_version) VALUES(_stripe_session_id,_user_id,_stripe_price_id,_catalogue_version) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT quote FROM private.additional_event_checkout_quotes WHERE stripe_session_id=_stripe_session_id;
 IF quote.user_id IS DISTINCT FROM _user_id OR quote.stripe_price_id IS DISTINCT FROM _stripe_price_id OR quote.catalogue_version IS DISTINCT FROM _catalogue_version THEN RAISE EXCEPTION 'Additional-event quote already bound to a different purchase'; END IF;
 RETURN jsonb_build_object('recorded',true,'total_cents',quote.total_cents);
END $f$;
REVOKE ALL ON FUNCTION public.record_additional_event_checkout_quote(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_additional_event_checkout_quote(uuid,text,text,text) TO service_role;
CREATE TABLE private.first_event_credit_identity(
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 first_event_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE private.first_event_credit_baselines(
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,event_id uuid NOT NULL,
 baseline_total integer NOT NULL CHECK(baseline_total>=0),baseline_funded integer NOT NULL CHECK(baseline_funded>=0),
 PRIMARY KEY(owner_id,event_id));
ALTER TABLE private.first_event_credit_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.first_event_credit_baselines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.first_event_credit_identity,private.first_event_credit_baselines FROM PUBLIC,anon,authenticated,service_role;
-- Slot history includes deleted events and is preferred when its timestamp is earlier.
INSERT INTO private.first_event_credit_identity(owner_id,first_event_id)
 SELECT DISTINCT ON(owner_id) owner_id,event_id FROM (
 SELECT user_id owner_id,id event_id,created_at FROM public.events
 UNION ALL SELECT owner_id,event_id,created_at FROM private.event_allowance_slots
 ) history WHERE owner_id IS NOT NULL ORDER BY owner_id,created_at,event_id;
INSERT INTO private.first_event_credit_baselines(owner_id,event_id,baseline_total,baseline_funded)
 SELECT user_id,event_id,total,private.promotion_funded_credits(user_id,event_id) FROM public.sms_credits;
CREATE FUNCTION private.capture_first_event_credit_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||NEW.user_id::text,0));
 INSERT INTO private.first_event_credit_identity(owner_id,first_event_id) VALUES(NEW.user_id,NEW.id) ON CONFLICT(owner_id) DO NOTHING;
 RETURN NEW;
END $f$;
CREATE TRIGGER capture_first_event_credit_identity BEFORE INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION private.capture_first_event_credit_identity();
CREATE FUNCTION private.first_event_credit_allowance(p_user uuid,p_event uuid,p_allowance integer)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM private.first_event_credit_identity WHERE owner_id=p_user AND first_event_id=p_event)
 THEN greatest(coalesce(p_allowance,0),0) ELSE 0 END
$f$;
CREATE FUNCTION private.guard_first_event_included_credit_grant() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE first_id uuid;baseline integer;funded_before integer;allowed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||NEW.user_id::text,0));
 SELECT first_event_id INTO first_id FROM private.first_event_credit_identity WHERE owner_id=NEW.user_id;
 IF first_id=NEW.event_id THEN RETURN NEW; END IF;
 IF first_id IS NULL THEN RAISE EXCEPTION 'First-event credit identity is unavailable'; END IF;
 SELECT baseline_total,baseline_funded INTO baseline,funded_before FROM private.first_event_credit_baselines WHERE owner_id=NEW.user_id AND event_id=NEW.event_id;
 allowed:=coalesce(baseline,0)+greatest(private.promotion_funded_credits(NEW.user_id,NEW.event_id)-coalesce(funded_before,0),0);
 IF TG_OP='UPDATE' THEN allowed:=greatest(allowed,OLD.total); END IF;
 NEW.total:=least(NEW.total,allowed);RETURN NEW;
END $f$;
CREATE TRIGGER enforce_first_event_included_credit_policy BEFORE INSERT OR UPDATE OF total ON public.sms_credits FOR EACH ROW EXECUTE FUNCTION private.guard_first_event_included_credit_grant();
REVOKE ALL ON FUNCTION private.capture_first_event_credit_identity(),private.first_event_credit_allowance(uuid,uuid,integer),private.guard_first_event_included_credit_grant() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_sms_credits(_user_id uuid, _event_id uuid)
 RETURNS TABLE(total integer, used integer, remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  _allowance integer;
BEGIN
  IF coalesce(auth.jwt()->>'role','')<>'service_role' THEN
   IF _user_id IS DISTINCT FROM auth.uid() AND _user_id IS DISTINCT FROM public.current_planning_account_owner() THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
   _user_id:=public.current_planning_account_owner();
   IF _user_id IS NULL THEN RAISE EXCEPTION 'not authorised' USING ERRCODE='42501'; END IF;
  END IF;
 
  IF public.current_planning_account_owner() IS DISTINCT FROM _user_id
     AND coalesce(auth.jwt()->>'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'not authorised' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = _event_id AND e.user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'event not found or not authorised' USING ERRCODE = '42501';
  END IF;

  IF private.is_platform_owner(_user_id)
     AND public.has_role(_user_id, 'admin'::public.app_role) THEN
    _allowance := 450;
  ELSE
    SELECT CASE us.plan_id
      WHEN '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid THEN 150
      WHEN '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid THEN 250
      WHEN 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid THEN 450
      ELSE 0
    END INTO _allowance
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.status IN ('active', 'trialing', 'grace_period')
    ORDER BY us.created_at DESC
    LIMIT 1;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('account-return:'||_user_id::text,0));
  _allowance := private.first_event_credit_allowance(_user_id,_event_id,coalesce(_allowance,0));
  INSERT INTO public.sms_credits (user_id, event_id, total, used)
  VALUES (_user_id, _event_id, _allowance, 0)
  ON CONFLICT (user_id, event_id) DO UPDATE
    SET total = greatest(public.sms_credits.total, _allowance), updated_at = now();

  RETURN QUERY
  SELECT c.total, c.used, c.remaining
  FROM public.sms_credits c
  WHERE c.user_id = _user_id AND c.event_id = _event_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.fulfill_communication_credit_topup(_user_id uuid, _event_id uuid, _stripe_session_id text, _stripe_payment_id text, _stripe_price_id text, _amount_paid numeric, _pack_key text, _credits integer)
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

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('account-return:'||_user_id::text,0));
  plan_allowance:=private.first_event_credit_allowance(_user_id,_event_id,plan_allowance);
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
$function$;
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

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('account-return:'||_user_id::text,0));
  plan_allowance:=private.first_event_credit_allowance(_user_id,_event_id,plan_allowance);
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
$function$;
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
  IF NOT ((_stripe_price_id='price_1UFTqL5GzTmqOxGKgPWVdCwr' AND _amount=10890)
     OR (_amount=9900 AND EXISTS(SELECT 1 FROM private.additional_event_checkout_quotes q WHERE q.stripe_session_id=_stripe_session_id AND q.user_id=_user_id AND q.stripe_price_id=_stripe_price_id AND q.catalogue_version='ww_additional_event_99_total_v1' AND q.total_cents=_amount)))
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
    'amount', _amount,
    'currency', 'AUD'
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.fulfill_additional_event_purchase_gst(uuid,text,text,integer,text),public.fulfill_communication_credit_topup(uuid,uuid,text,text,text,numeric,text,integer),public.fulfill_communication_credit_topup_gst(uuid,uuid,text,text,text,numeric,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_additional_event_purchase_gst(uuid,text,text,integer,text),public.fulfill_communication_credit_topup(uuid,uuid,text,text,text,numeric,text,integer),public.fulfill_communication_credit_topup_gst(uuid,uuid,text,text,text,numeric,text,integer) TO service_role;
COMMIT;
