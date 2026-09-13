-- LOCAL PREPARATION ONLY. Does not grant access, charge customers or activate checkout.
BEGIN;
CREATE TABLE public.promotion_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK(code=upper(btrim(code)) AND code ~ '^[A-Z0-9][A-Z0-9 %_-]{0,63}$'),
 campaign_name text NOT NULL CHECK(length(btrim(campaign_name)) BETWEEN 1 AND 120),
 percent_off integer NOT NULL CHECK(percent_off BETWEEN 1 AND 100),
 active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.promotion_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id uuid NOT NULL REFERENCES public.promotion_campaigns(id) ON DELETE RESTRICT,
 -- Intentionally retained independently of auth.users: re-registration must not reset use.
 normalized_email text NOT NULL CHECK(normalized_email=lower(btrim(normalized_email)) AND normalized_email<>''),
 account_user_id uuid NOT NULL,
 plan_key text NOT NULL CHECK(plan_key IN ('essential','premium','unlimited')),
 percent_off integer NOT NULL CHECK(percent_off BETWEEN 1 AND 100),
 included_credits integer NOT NULL CHECK(included_credits IN (0,150,250,450)),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','completed','released')),
 attempt_number integer NOT NULL DEFAULT 0 CHECK(attempt_number>=0),
 stripe_session_id text UNIQUE,
 stripe_coupon_id text,
 stripe_customer_id text,
 stripe_product_id text,
 stripe_payment_intent_id text UNIQUE,
 completion_event_id text UNIQUE,
 livemode boolean,
 original_trial_ends_at timestamptz,
 amount_subtotal_cents integer,
 amount_total_cents integer,
 discount_cents integer,
 term_started_at timestamptz,
 term_expires_at timestamptz,
 activated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 UNIQUE(campaign_id,normalized_email)
);
ALTER TABLE public.promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.promotion_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promotion_campaigns,private.promotion_redemptions FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE private.promotion_expired_attempts (
 stripe_session_id text PRIMARY KEY,
 reservation_id uuid NOT NULL REFERENCES private.promotion_redemptions(id) ON DELETE RESTRICT,
 attempt_number integer NOT NULL,
 provider_evidence jsonb NOT NULL,
 reconciled_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reservation_id,attempt_number)
);
ALTER TABLE private.promotion_expired_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.promotion_expired_attempts FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.admin_manage_promotion(p_actor uuid,p_action text,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE campaign public.promotion_campaigns; result jsonb;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role'
 OR p_actor IS NULL OR private.is_platform_owner(p_actor) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified platform owner required' USING ERRCODE='42501'; END IF;
 IF p_action='list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at DESC),'[]'::jsonb) INTO result FROM public.promotion_campaigns c;
  RETURN result;
 ELSIF p_action='create' THEN
  INSERT INTO public.promotion_campaigns(code,campaign_name,percent_off,created_by)
  VALUES(upper(btrim(p_payload->>'code')),btrim(p_payload->>'campaign_name'),(p_payload->>'percent_off')::integer,p_actor)
  RETURNING * INTO campaign;
 ELSIF p_action='set_active' THEN
  IF jsonb_typeof(p_payload->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Active must be boolean'; END IF;
  UPDATE public.promotion_campaigns SET active=(p_payload->>'active')::boolean,updated_at=now()
  WHERE id=(p_payload->>'id')::uuid RETURNING * INTO campaign;
  IF NOT FOUND THEN RAISE EXCEPTION 'Promotion not found'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported promotion action'; END IF;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(p_actor,p_actor,'promotion_'||p_action,jsonb_build_object('campaign_id',campaign.id,'percent_off',campaign.percent_off,'active',campaign.active));
 RETURN to_jsonb(campaign);
END $$;
REVOKE ALL ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_promotion(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.reserve_first_purchase_promotion(p_user uuid,p_code text,p_plan text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE campaign public.promotion_campaigns; email text; reservation private.promotion_redemptions;
 normal_credits integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL
 AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master'
 AND accepted_at IS NOT NULL AND access_disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Verified operational account master required' USING ERRCODE='42501'; END IF;
 normal_credits:=CASE p_plan WHEN 'essential' THEN 150 WHEN 'premium' THEN 250 WHEN 'unlimited' THEN 450 END;
 IF normal_credits IS NULL THEN RAISE EXCEPTION 'Approved first package required'; END IF;
 -- Same lock as original paid fulfillment prevents simultaneous first purchase paths.
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||p_user::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('promotion-email:'||email,0));
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE normalized_email=email AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'Promotions apply only to the first package purchase' USING ERRCODE='42501'; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Promo code is unavailable'; END IF;
 SELECT * INTO reservation FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND normalized_email=email FOR UPDATE;
 IF FOUND THEN
  IF reservation.state<>'reserved' OR reservation.account_user_id<>p_user OR reservation.plan_key<>p_plan THEN
   RAISE EXCEPTION 'Promotion already used or reserved for another checkout'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE normalized_email=email AND state='reserved') THEN
   RAISE EXCEPTION 'An earlier promotional checkout must be reconciled first'; END IF;
  INSERT INTO private.promotion_redemptions(campaign_id,normalized_email,account_user_id,plan_key,percent_off,included_credits)
  VALUES(campaign.id,email,p_user,p_plan,campaign.percent_off,CASE WHEN campaign.percent_off<=50 THEN normal_credits ELSE 0 END)
  RETURNING * INTO reservation;
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
  VALUES(p_user,p_user,'promotion_reserved',jsonb_build_object('campaign_id',campaign.id,'reservation_id',reservation.id));
 END IF;
 RETURN jsonb_build_object('id',reservation.id,'campaign_id',campaign.id,'percent_off',reservation.percent_off,
  'included_credits',reservation.included_credits,'plan_key',reservation.plan_key,'stripe_session_id',reservation.stripe_session_id,'attempt_number',reservation.attempt_number);
END $$;
REVOKE ALL ON FUNCTION public.reserve_first_purchase_promotion(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_first_purchase_promotion(uuid,text,text) TO service_role;
CREATE FUNCTION public.quote_first_purchase_promotion(p_user uuid,p_code text,p_plan text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE campaign public.promotion_campaigns; email text; amount integer; credits integer;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Verified operational account master required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE normalized_email=email AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'First purchase only' USING ERRCODE='42501'; END IF;
 amount:=CASE p_plan WHEN 'essential' THEN 19900 WHEN 'premium' THEN 24900 WHEN 'unlimited' THEN 29900 END;
 credits:=CASE p_plan WHEN 'essential' THEN 150 WHEN 'premium' THEN 250 WHEN 'unlimited' THEN 450 END;
 IF amount IS NULL THEN RAISE EXCEPTION 'Approved package required'; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active;
 IF NOT FOUND THEN RAISE EXCEPTION 'Code unavailable'; END IF;
 RETURN jsonb_build_object('campaign_id',campaign.id,'code',campaign.code,'plan_key',p_plan,'percent_off',campaign.percent_off,
 'subtotal_cents',amount-round(amount::numeric*campaign.percent_off/100),'currency','AUD',
 'included_credits',CASE WHEN campaign.percent_off<=50 THEN credits ELSE 0 END);
END $$;
REVOKE ALL ON FUNCTION public.quote_first_purchase_promotion(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.quote_first_purchase_promotion(uuid,text,text) TO service_role;
-- Recording completion is deliberately distinct from activating subscriptions.
-- These boundaries are prepared for the provider adapter; no client can invoke them.
CREATE FUNCTION public.bind_promotion_checkout(p_reservation uuid,p_session text,p_customer text,p_product text,p_coupon text,p_live boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r private.promotion_redemptions; deadline timestamptz; expected_product text;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_session IS NULL OR p_session !~ '^cs_[A-Za-z0-9_]+$' OR p_customer IS NULL OR p_customer !~ '^cus_[A-Za-z0-9]+$'
 OR p_coupon IS NULL OR btrim(p_coupon)='' OR p_live IS NULL THEN RAISE EXCEPTION 'Provider binding required'; END IF;
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND OR r.state<>'reserved' THEN RAISE EXCEPTION 'Reserved checkout required'; END IF;
 IF EXISTS(SELECT 1 FROM private.promotion_expired_attempts WHERE stripe_session_id=p_session) THEN RAISE EXCEPTION 'Expired checkout cannot be rebound'; END IF;
 expected_product:=CASE r.plan_key WHEN 'essential' THEN 'prod_UOQhHcOhFdrhOs' WHEN 'premium' THEN 'prod_UOQhTWnFzXV1FK' WHEN 'unlimited' THEN 'prod_UOQhLIYTxQAd7U' END;
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

CREATE FUNCTION public.record_verified_promotion_completion(p_evidence jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE r private.promotion_redemptions; reference timestamptz; started timestamptz; deadline timestamptz;
 amount integer; discounted integer; total integer; intent text; event_id text; actor uuid;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT account_user_id INTO actor FROM private.promotion_redemptions WHERE id=(p_evidence->>'reservation_id')::uuid;
 IF actor IS NULL THEN RAISE EXCEPTION 'Recorded reservation required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=(p_evidence->>'reservation_id')::uuid FOR UPDATE;
 IF private.account_planning_blocked(actor) OR private.admin_deleted_planning_blocked(actor)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=actor AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=actor AND member_user_id=actor AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND lower(btrim(email))=r.normalized_email AND email_confirmed_at IS NOT NULL AND coalesce(is_anonymous,false)=false) THEN
  RAISE EXCEPTION 'Verified unrestricted account master required' USING ERRCODE='42501'; END IF;
 amount:=CASE r.plan_key WHEN 'essential' THEN 19900 WHEN 'premium' THEN 24900 WHEN 'unlimited' THEN 29900 END;
 discounted:=round(amount::numeric*r.percent_off/100);
 total:=(p_evidence->>'amount_total_cents')::integer;
 intent:=nullif(p_evidence->>'payment_intent_id','');event_id:=p_evidence->>'completion_event_id';
 reference:=(p_evidence->>'completed_at')::timestamptz;
 IF r.state NOT IN ('reserved','completed') OR r.stripe_session_id IS NULL OR r.original_trial_ends_at IS NULL
 OR p_evidence->>'session_id' IS DISTINCT FROM r.stripe_session_id OR p_evidence->>'currency' IS DISTINCT FROM 'AUD'
 OR (p_evidence->>'livemode')::boolean IS DISTINCT FROM r.livemode OR r.livemode IS DISTINCT FROM true
 OR (p_evidence->>'amount_subtotal_cents')::integer IS DISTINCT FROM amount
 OR (p_evidence->>'discount_cents')::integer IS DISTINCT FROM discounted
 OR total IS NULL OR total<amount-discounted OR event_id IS NULL OR event_id !~ '^evt_[A-Za-z0-9]+$'
 OR reference IS NULL OR NOT isfinite(reference) OR reference<date_trunc('second',r.created_at) OR reference>now()
 OR r.percent_off=100 AND (total<>0 OR intent IS NOT NULL OR p_evidence->>'payment_status' IS DISTINCT FROM 'no_payment_required')
 OR r.percent_off<100 AND (intent IS NULL OR intent !~ '^pi_[A-Za-z0-9]+$' OR p_evidence->>'payment_status' IS DISTINCT FROM 'paid') THEN
  RAISE EXCEPTION 'Verified immutable provider completion evidence required'; END IF;
 started:=greatest(reference,r.original_trial_ends_at);
 deadline:=((started AT TIME ZONE 'UTC')+interval '12 months') AT TIME ZONE 'UTC';
 IF r.state='completed' THEN
  IF r.completion_event_id IS DISTINCT FROM event_id OR r.completed_at IS DISTINCT FROM reference OR r.amount_total_cents IS DISTINCT FROM total
  OR r.stripe_payment_intent_id IS DISTINCT FROM intent THEN RAISE EXCEPTION 'Completion replay evidence changed'; END IF;
  RETURN jsonb_build_object('result','already_recorded','starts_at',r.term_started_at,'expires_at',r.term_expires_at);
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('promotion-email:'||r.normalized_email,0));
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=actor)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE normalized_email=r.normalized_email AND state='completed' AND id<>r.id) THEN
  RAISE EXCEPTION 'First package purchase has already been completed'; END IF;
 UPDATE private.promotion_redemptions SET state='completed',completed_at=reference,completion_event_id=event_id,
  stripe_payment_intent_id=intent,amount_subtotal_cents=amount,amount_total_cents=total,discount_cents=discounted,
  term_started_at=started,term_expires_at=deadline WHERE id=r.id;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'promotion_completion_recorded',jsonb_build_object('reservation_id',r.id,'included_credits',r.included_credits,'starts_at',started,'expires_at',deadline));
 RETURN jsonb_build_object('result','recorded','starts_at',started,'expires_at',deadline);
END $$;
REVOKE ALL ON FUNCTION public.record_verified_promotion_completion(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_promotion_completion(jsonb) TO service_role;
CREATE FUNCTION private.guard_competing_promotion_purchase() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||NEW.user_id::text,0));
 IF EXISTS(SELECT 1 FROM private.promotion_redemptions r WHERE r.state='completed'
 AND (r.stripe_payment_intent_id=NEW.stripe_payment_intent_id OR
 (r.account_user_id=NEW.user_id AND NEW.purpose<>'upgrade' AND r.term_expires_at>NEW.payment_reference_at))) THEN
  RAISE EXCEPTION 'An original promotional term or payment is already recorded'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_competing_promotion_purchase() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prevent_competing_promotion_purchase BEFORE INSERT ON public.paid_plan_purchases
 FOR EACH ROW EXECUTE FUNCTION private.guard_competing_promotion_purchase();

CREATE TABLE private.promotion_credit_baselines (
 reservation_id uuid NOT NULL REFERENCES private.promotion_redemptions(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL,event_id uuid NOT NULL,baseline_total integer NOT NULL CHECK(baseline_total>=0),
 baseline_funded integer NOT NULL CHECK(baseline_funded>=0),
 PRIMARY KEY(reservation_id,event_id)
);
ALTER TABLE private.promotion_credit_baselines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.promotion_credit_baselines FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.promotion_funded_credits(p_user uuid,p_event uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(sum(CASE WHEN guest_tier_label='Email & SMS Top-up +100 credits' AND amount_paid=49 THEN 100
 WHEN guest_tier_label='Email & SMS Top-up +10 credits' AND amount_paid=10 THEN 10 ELSE 0 END),0)::integer
 FROM public.rsvp_invite_purchases WHERE user_id=p_user AND event_id=p_event AND purchase_type='communication_topup'
 AND status='completed' AND stripe_session_id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION private.promotion_funded_credits(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

-- Defense in depth across existing credit getters and top-up implementations.
-- This never decreases a retained balance and permits verified purchased increments.
CREATE FUNCTION private.guard_promotion_included_credit_grant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r private.promotion_redemptions; baseline integer; funded_before integer; allowed integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||NEW.user_id::text,0));
 SELECT p.* INTO r FROM private.promotion_redemptions p JOIN public.user_subscriptions s ON s.user_id=p.account_user_id
 AND s.started_at=p.term_started_at AND s.expires_at=p.term_expires_at
 WHERE p.account_user_id=NEW.user_id AND p.state='completed' AND p.activated_at IS NOT NULL AND p.included_credits=0;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT baseline_total,baseline_funded INTO baseline,funded_before FROM private.promotion_credit_baselines
 WHERE reservation_id=r.id AND event_id=NEW.event_id;
 IF TG_OP='INSERT' AND baseline IS NULL THEN
  INSERT INTO private.promotion_credit_baselines(reservation_id,user_id,event_id,baseline_total,baseline_funded)
  VALUES(r.id,NEW.user_id,NEW.event_id,0,0) ON CONFLICT DO NOTHING;
  baseline:=0;funded_before:=0;
 ELSIF TG_OP='UPDATE' AND baseline IS NULL THEN
  RAISE EXCEPTION 'Retained credit baseline must be captured before promotional activation'; END IF;
 allowed:=coalesce(baseline,0)+greatest(private.promotion_funded_credits(NEW.user_id,NEW.event_id)-coalesce(funded_before,0),0);
 IF TG_OP='UPDATE' THEN allowed:=greatest(allowed,OLD.total); END IF;
 NEW.total:=least(NEW.total,allowed);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_promotion_included_credit_grant() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER enforce_promotion_included_credit_policy BEFORE INSERT OR UPDATE OF total ON public.sms_credits
 FOR EACH ROW EXECUTE FUNCTION private.guard_promotion_included_credit_grant();

CREATE FUNCTION public.activate_due_promotion(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE r private.promotion_redemptions; plan uuid;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||p_user::text,0));
 SELECT * INTO r FROM private.promotion_redemptions WHERE account_user_id=p_user AND state='completed' FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('result','no_promotion'); END IF;
 IF private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Administrative or ownership restrictions prevent activation' USING ERRCODE='42501'; END IF;
 -- Test-mode records must never grant production planning access.
 IF r.livemode IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified live checkout required for access activation' USING ERRCODE='42501'; END IF;
 IF r.activated_at IS NOT NULL THEN RETURN jsonb_build_object('result','already_activated','starts_at',r.term_started_at,'expires_at',r.term_expires_at); END IF;
 IF now()<r.term_started_at THEN RETURN jsonb_build_object('result','scheduled','starts_at',r.term_started_at,'expires_at',r.term_expires_at,'included_credits',r.included_credits); END IF;
 IF now()>=r.term_expires_at THEN RETURN jsonb_build_object('result','expired','starts_at',r.term_started_at,'expires_at',r.term_expires_at); END IF;
 IF EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'Another original package is already recorded'; END IF;
 -- Credit-grant triggers share this account lock. Snapshot retained balances
 -- without row locks, avoiding lock-order inversion with concurrent top-ups.
 INSERT INTO private.promotion_credit_baselines(reservation_id,user_id,event_id,baseline_total,baseline_funded)
 SELECT r.id,p_user,event_id,total,private.promotion_funded_credits(p_user,event_id) FROM public.sms_credits WHERE user_id=p_user;
 plan:=CASE r.plan_key WHEN 'essential' THEN '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid
 WHEN 'premium' THEN '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid WHEN 'unlimited' THEN 'cd10f207-2109-4546-a635-0baa68ba8213'::uuid END;
 INSERT INTO public.user_subscriptions(user_id,plan_id,started_at,expires_at,status,is_read_only)
 VALUES(p_user,plan,r.term_started_at,r.term_expires_at,'active',false)
 ON CONFLICT(user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,started_at=EXCLUDED.started_at,expires_at=EXCLUDED.expires_at,
 status='active',is_read_only=false,grace_period_ends_at=NULL,updated_at=now();
 UPDATE private.promotion_redemptions SET activated_at=now() WHERE id=r.id;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(p_user,p_user,'promotion_activated',jsonb_build_object('reservation_id',r.id,'included_credits',r.included_credits,'starts_at',r.term_started_at,'expires_at',r.term_expires_at));
 RETURN jsonb_build_object('result','activated','starts_at',r.term_started_at,'expires_at',r.term_expires_at,'included_credits',r.included_credits);
END $$;
REVOKE ALL ON FUNCTION public.activate_due_promotion(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.activate_due_promotion(uuid) TO service_role;
CREATE TABLE private.promotion_customer_bindings(user_id uuid PRIMARY KEY,customer_id text NOT NULL UNIQUE CHECK(customer_id ~ '^cus_[A-Za-z0-9]+$'));
ALTER TABLE private.promotion_customer_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.promotion_customer_bindings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.promotion_customer_binding(p_user uuid,p_customer text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ DECLARE existing text; BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_user IS NULL THEN RAISE EXCEPTION 'Account required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('promotion-customer:'||p_user::text,0));
 SELECT customer_id INTO existing FROM private.promotion_customer_bindings WHERE user_id=p_user;
 IF p_customer IS NOT NULL THEN
  IF existing IS NOT NULL AND existing IS DISTINCT FROM p_customer THEN RAISE EXCEPTION 'Customer binding changed'; END IF;
  INSERT INTO private.promotion_customer_bindings VALUES(p_user,p_customer) ON CONFLICT DO NOTHING;
  existing:=p_customer;
 END IF;
 RETURN existing;
END $$;
REVOKE ALL ON FUNCTION public.promotion_customer_binding(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotion_customer_binding(uuid,text) TO service_role;
CREATE FUNCTION public.promotion_checkout_context(p_session text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$ DECLARE r private.promotion_redemptions; BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM private.promotion_redemptions WHERE stripe_session_id=p_session;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recorded checkout required'; END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.promotion_checkout_context(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotion_checkout_context(text) TO service_role;
CREATE FUNCTION public.fulfill_promotion_checkout_atomic(p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ DECLARE recorded jsonb; activated jsonb; actor uuid; BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 recorded:=public.record_verified_promotion_completion(p_evidence);
 SELECT account_user_id INTO actor FROM private.promotion_redemptions WHERE id=(p_evidence->>'reservation_id')::uuid;
 activated:=public.activate_due_promotion(actor);
 RETURN jsonb_build_object('result',CASE WHEN recorded->>'result'='already_recorded' THEN 'already_fulfilled' ELSE 'fulfilled' END,
 'starts_at',recorded->'starts_at','expires_at',recorded->'expires_at','activation',activated->>'result');
END $$;
REVOKE ALL ON FUNCTION public.fulfill_promotion_checkout_atomic(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_promotion_checkout_atomic(jsonb) TO service_role;
CREATE FUNCTION public.get_promotion_state(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ DECLARE activated jsonb; r private.promotion_redemptions; code text; BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 activated:=public.activate_due_promotion(p_user);
 SELECT * INTO r FROM private.promotion_redemptions WHERE account_user_id=p_user AND state='completed';
 IF NOT FOUND THEN RETURN jsonb_build_object('state','none','server_now',now()); END IF;
 SELECT c.code INTO code FROM public.promotion_campaigns c WHERE c.id=r.campaign_id;
 RETURN jsonb_build_object('state',CASE WHEN now()>=r.term_expires_at THEN 'expired' WHEN now()<r.term_started_at THEN 'scheduled' ELSE 'active' END,
 'reservation_id',r.id,'code',code,'plan_key',r.plan_key,'percent_off',r.percent_off,'included_credits',r.included_credits,
 'starts_at',r.term_started_at,'expires_at',r.term_expires_at,'server_now',now());
END $$;
REVOKE ALL ON FUNCTION public.get_promotion_state(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_promotion_state(uuid) TO service_role;
CREATE FUNCTION public.promotion_session_active(p_user uuid,p_session uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,auth AS $$ BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 RETURN EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=p_user AND id=p_session);
END $$;
REVOKE ALL ON FUNCTION public.promotion_session_active(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotion_session_active(uuid,uuid) TO service_role;

CREATE FUNCTION public.reconcile_expired_promotion_checkout(p_reservation uuid,p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE actor uuid; r private.promotion_redemptions; session text;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT account_user_id INTO actor FROM private.promotion_redemptions WHERE id=p_reservation;
 IF actor IS NULL THEN RAISE EXCEPTION 'Recorded reservation required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_reservation FOR UPDATE;
 session:=p_evidence->>'id';
 IF session IS NULL OR session !~ '^cs_[A-Za-z0-9_]+$' THEN RAISE EXCEPTION 'Retrieved checkout required'; END IF;
 IF EXISTS(SELECT 1 FROM private.promotion_expired_attempts WHERE stripe_session_id=session AND reservation_id=r.id) THEN RETURN jsonb_build_object('result','already_reconciled'); END IF;
 IF r.state<>'reserved' OR r.stripe_session_id IS DISTINCT FROM session
 OR p_evidence->>'status' IS DISTINCT FROM 'expired' OR p_evidence->>'payment_status' IS DISTINCT FROM 'unpaid'
 OR p_evidence->>'mode' IS DISTINCT FROM 'payment' OR p_evidence->>'customer' IS DISTINCT FROM r.stripe_customer_id
 OR (p_evidence->>'livemode')::boolean IS DISTINCT FROM r.livemode
 OR p_evidence#>>'{metadata,promotion_reservation_id}' IS DISTINCT FROM r.id::text
 OR p_evidence#>>'{metadata,user_id}' IS DISTINCT FROM actor::text
 OR p_evidence->>'payment_intent' IS NOT NULL OR r.completion_event_id IS NOT NULL THEN
  RAISE EXCEPTION 'Only provider-confirmed expired unpaid checkout can be reconciled'; END IF;
 INSERT INTO private.promotion_expired_attempts(stripe_session_id,reservation_id,attempt_number,provider_evidence)
 VALUES(session,r.id,r.attempt_number,p_evidence);
 UPDATE private.promotion_redemptions SET stripe_session_id=NULL,stripe_coupon_id=NULL,stripe_product_id=NULL,
 attempt_number=attempt_number+1 WHERE id=r.id;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'promotion_expired_checkout_reconciled',jsonb_build_object('reservation_id',r.id,'session_id',session));
 RETURN jsonb_build_object('result','reconciled');
END $$;
REVOKE ALL ON FUNCTION public.reconcile_expired_promotion_checkout(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_expired_promotion_checkout(uuid,jsonb) TO service_role;
CREATE FUNCTION public.get_admin_promotion_payments() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=auth.uid(); result jsonb;
BEGIN
 IF actor IS NULL OR private.is_platform_owner(actor) IS DISTINCT FROM true OR public.is_owner_admin() IS DISTINCT FROM true
 OR NOT EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=actor AND id::text=auth.jwt()->>'session_id') THEN RAISE EXCEPTION 'Current platform owner session required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.account_user_id,
 'customer_name',coalesce(nullif(concat_ws(' ',p.first_name,p.last_name),''),r.normalized_email),'email',r.normalized_email,
 'payment_type',CASE WHEN r.percent_off=100 THEN 'promotion_no_cost' ELSE 'promotion_plan_purchase' END,
 'status','completed','amount_paid',r.amount_total_cents::numeric/100,'payment_date',r.completed_at,
 'payment_method',CASE WHEN r.percent_off=100 THEN 'No-cost checkout' ELSE 'Stripe' END,
 'stripe_reference',coalesce(r.stripe_payment_intent_id,r.stripe_session_id)) ORDER BY r.completed_at DESC),'[]'::jsonb)
 INTO result FROM private.promotion_redemptions r LEFT JOIN public.profiles p ON p.id=r.account_user_id
 WHERE r.state='completed' AND r.livemode=true;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_promotion_payments() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_promotion_payments() TO authenticated;
CREATE FUNCTION public.promotion_refund_payment_context(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r private.promotion_redemptions;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_id AND state='completed' AND percent_off<100 AND stripe_payment_intent_id IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified paid promotional purchase required'; END IF;
 RETURN to_jsonb(r)||jsonb_build_object('user_id',r.account_user_id);
END $$;
REVOKE ALL ON FUNCTION public.promotion_refund_payment_context(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotion_refund_payment_context(uuid) TO service_role;
-- Preserve the existing snapshot implementation and client contract. Merge the
-- verified promotional ledger server-side rather than adding browser requests.
ALTER FUNCTION public.get_admin_platform_snapshot() RENAME TO get_admin_platform_snapshot_before_promotions;
ALTER FUNCTION public.get_admin_platform_snapshot_before_promotions() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_admin_platform_snapshot_before_promotions() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.get_admin_platform_snapshot() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE snapshot jsonb; payments jsonb;
BEGIN
 payments:=public.get_admin_promotion_payments();
 snapshot:=private.get_admin_platform_snapshot_before_promotions();
 RETURN jsonb_set(snapshot,'{payments}',coalesce(snapshot->'payments','[]'::jsonb)||payments);
END $$;
REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
COMMIT;
