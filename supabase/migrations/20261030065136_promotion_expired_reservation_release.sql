-- No existing campaign, reservation or payment row is rewritten by this migration.
-- Recover capacity only after the backend retrieves Stripe's expired/unpaid
-- session. Preserve the expiry archive so a released attempt cannot be rebound.
BEGIN;
ALTER TABLE private.promotion_redemptions ADD COLUMN attempt_started_at timestamptz NOT NULL DEFAULT now();
CREATE OR REPLACE FUNCTION public.bind_promotion_checkout(p_reservation uuid, p_session text, p_customer text, p_product text, p_coupon text, p_live boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE r private.promotion_redemptions; deadline timestamptz; expected_product text;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF p_session IS NULL OR p_session !~ '^cs_[A-Za-z0-9_]+$' OR p_customer IS NULL OR p_customer !~ '^cus_[A-Za-z0-9]+$'
 OR p_coupon IS NULL OR btrim(p_coupon)='' OR p_live IS NULL THEN RAISE EXCEPTION 'Provider binding required'; END IF;
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_reservation FOR UPDATE;
 IF NOT FOUND OR r.state<>'reserved' THEN RAISE EXCEPTION 'Reserved checkout required'; END IF;
 IF p_coupon IS DISTINCT FROM ('ww-promotion-'||r.id::text||CASE WHEN r.attempt_number=0 THEN '' ELSE ':'||r.attempt_number::text END) THEN RAISE EXCEPTION 'Current provider attempt required'; END IF;
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
END $function$;
REVOKE ALL ON FUNCTION public.bind_promotion_checkout(uuid,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bind_promotion_checkout(uuid,text,text,text,text,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.reconcile_expired_promotion_checkout(p_reservation uuid, p_evidence jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE actor uuid; r private.promotion_redemptions; session text;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT account_user_id INTO actor FROM private.promotion_redemptions WHERE id=p_reservation;
 IF actor IS NULL THEN RAISE EXCEPTION 'Recorded reservation required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 -- Match reservation lock ordering: account, campaign, then reservation.
 PERFORM 1 FROM public.promotion_campaigns WHERE id=(SELECT campaign_id FROM private.promotion_redemptions WHERE id=p_reservation) FOR UPDATE;
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
 OR (p_evidence->>'payment_intent' IS NOT NULL AND (
   jsonb_typeof(p_evidence->'expired_payment_intent') IS DISTINCT FROM 'object'
   OR p_evidence#>>'{expired_payment_intent,id}' IS DISTINCT FROM p_evidence->>'payment_intent'
   OR p_evidence#>>'{expired_payment_intent,status}' IS DISTINCT FROM 'canceled'
   OR (p_evidence#>>'{expired_payment_intent,amount_received}')::integer IS DISTINCT FROM 0
   OR p_evidence#>>'{expired_payment_intent,customer}' IS DISTINCT FROM r.stripe_customer_id
   OR (p_evidence#>>'{expired_payment_intent,livemode}')::boolean IS DISTINCT FROM r.livemode
   OR (p_evidence#>>'{expired_payment_intent,paid_charge}')::boolean IS DISTINCT FROM false))
 OR r.completion_event_id IS NOT NULL THEN
  RAISE EXCEPTION 'Only provider-confirmed expired unpaid checkout can be reconciled'; END IF;
 INSERT INTO private.promotion_expired_attempts(stripe_session_id,reservation_id,attempt_number,provider_evidence)
 VALUES(session,r.id,r.attempt_number,p_evidence);
 UPDATE private.promotion_redemptions SET state='released',stripe_session_id=NULL,stripe_coupon_id=NULL,stripe_product_id=NULL,
 attempt_number=attempt_number+1 WHERE id=r.id;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'promotion_expired_checkout_released',jsonb_build_object('reservation_id',r.id,'session_id',session));
 RETURN jsonb_build_object('result','released');
END $function$;
REVOKE ALL ON FUNCTION public.reconcile_expired_promotion_checkout(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_expired_promotion_checkout(uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_first_purchase_promotion(p_user uuid, p_code text, p_plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth'
AS $function$
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
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (normalized_email=email OR account_user_id=p_user) AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN
 ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN
  RAISE EXCEPTION 'Promotions apply only to the first package purchase' USING ERRCODE='42501'; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Promo code is unavailable'; END IF;
 IF campaign.audience='customer' AND campaign.bound_account_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'Code is restricted to its selected customer account' USING ERRCODE='42501'; END IF;
 IF campaign.usage_limit=0 THEN RAISE EXCEPTION 'This campaign allows no redemptions'; END IF;
 SELECT * INTO reservation FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND normalized_email=email FOR UPDATE;
 IF FOUND AND reservation.state='reserved' THEN
  IF reservation.account_user_id<>p_user OR reservation.plan_key<>p_plan THEN
   RAISE EXCEPTION 'Promotion already used or reserved for another checkout'; END IF;
  IF reservation.stripe_session_id IS NULL THEN
   UPDATE private.promotion_redemptions SET attempt_started_at=now() WHERE id=reservation.id RETURNING * INTO reservation;
  END IF;
 ELSE
  IF reservation.id IS NOT NULL AND (reservation.state<>'released' OR reservation.account_user_id<>p_user) THEN
   RAISE EXCEPTION 'Promotion already used or reserved for another checkout'; END IF;
  IF EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (normalized_email=email OR account_user_id=p_user) AND state='reserved') THEN
   RAISE EXCEPTION 'An earlier promotional checkout must be reconciled first'; END IF;
  -- The campaign row lock covers new and reactivated reservations alike.
  IF campaign.usage_limit IS NOT NULL AND (SELECT count(*) FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND state IN ('reserved','completed'))>=campaign.usage_limit THEN
   RAISE EXCEPTION 'Campaign allocation is fully used or reserved'; END IF;
  IF reservation.id IS NULL THEN
   INSERT INTO private.promotion_redemptions(campaign_id,normalized_email,account_user_id,plan_key,percent_off,included_credits)
   VALUES(campaign.id,email,p_user,p_plan,campaign.percent_off,CASE WHEN campaign.percent_off<=50 THEN normal_credits ELSE 0 END)
   RETURNING * INTO reservation;
  ELSE
   -- Only verified expiry or a stale, never-exposed unbound attempt can release.
   -- Keep the id and attempt archive; the next provider attempt has a new key.
   UPDATE private.promotion_redemptions SET state='reserved',attempt_started_at=now(),plan_key=p_plan,percent_off=campaign.percent_off,
    included_credits=CASE WHEN campaign.percent_off<=50 THEN normal_credits ELSE 0 END
   WHERE id=reservation.id RETURNING * INTO reservation;
  END IF;
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
  VALUES(p_user,p_user,'promotion_reserved',jsonb_build_object('campaign_id',campaign.id,'reservation_id',reservation.id,'attempt_number',reservation.attempt_number));
 END IF;
 RETURN jsonb_build_object('id',reservation.id,'campaign_id',campaign.id,'percent_off',reservation.percent_off,
  'included_credits',reservation.included_credits,'plan_key',reservation.plan_key,'stripe_session_id',reservation.stripe_session_id,'attempt_number',reservation.attempt_number);
END $function$;
REVOKE ALL ON FUNCTION public.reserve_first_purchase_promotion(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_first_purchase_promotion(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.promotion_expiry_candidates(p_user uuid,p_code text,p_live boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE campaign public.promotion_campaigns; email text; result jsonb; at_capacity boolean:=false;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT lower(btrim(u.email)) INTO email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL AND coalesce(u.is_anonymous,false)=false;
 IF email IS NULL OR p_live IS NULL OR private.account_planning_blocked(p_user) OR private.admin_deleted_planning_blocked(p_user)
 OR NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user AND member_user_id=p_user AND role='master' AND accepted_at IS NOT NULL AND access_disabled_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=p_user)
 OR EXISTS(SELECT 1 FROM private.promotion_redemptions WHERE (account_user_id=p_user OR normalized_email=email) AND state='completed')
 OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user AND plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')) THEN RETURN '[]'::jsonb; END IF;
 SELECT * INTO campaign FROM public.promotion_campaigns WHERE code=upper(btrim(p_code)) AND active AND deleted_at IS NULL AND (audience<>'customer' OR bound_account_id=p_user);
 IF FOUND AND campaign.usage_limit IS NOT NULL AND campaign.usage_limit>0 THEN
  at_capacity:=(SELECT count(*) FROM private.promotion_redemptions WHERE campaign_id=campaign.id AND state IN ('reserved','completed'))>=campaign.usage_limit;
 END IF;
 -- Recover the caller's own abandoned attempt even when they change codes or
 -- the original campaign was paused/deleted. Other accounts are inspected only
 -- when the requested campaign needs shared capacity.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'session_id',r.stripe_session_id,'started_at',r.attempt_started_at,'target_full',at_capacity,'campaign_hold',r.campaign_id=campaign.id)),'[]'::jsonb) INTO result
 FROM (SELECT id,campaign_id,stripe_session_id,attempt_started_at FROM private.promotion_redemptions WHERE state='reserved'
  AND (account_user_id=p_user OR (at_capacity AND campaign_id=campaign.id))
  AND ((stripe_session_id IS NOT NULL AND livemode=p_live) OR (stripe_session_id IS NULL AND attempt_started_at<now()-interval '10 minutes')) ORDER BY (account_user_id=p_user) DESC,created_at,id LIMIT 101) r;
 RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.promotion_expiry_candidates(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.promotion_expiry_candidates(uuid,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.release_unbound_promotion_reservation(p_reservation uuid,p_started_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $function$
DECLARE actor uuid; r private.promotion_redemptions;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 SELECT account_user_id INTO actor FROM private.promotion_redemptions WHERE id=p_reservation;
 IF actor IS NULL THEN RAISE EXCEPTION 'Recorded reservation required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 PERFORM 1 FROM public.promotion_campaigns WHERE id=(SELECT campaign_id FROM private.promotion_redemptions WHERE id=p_reservation) FOR UPDATE;
 SELECT * INTO r FROM private.promotion_redemptions WHERE id=p_reservation FOR UPDATE;
 IF r.state<>'reserved' OR r.stripe_session_id IS NOT NULL OR p_started_at IS NULL
 OR r.attempt_started_at IS DISTINCT FROM p_started_at OR r.attempt_started_at>now()-interval '10 minutes' THEN
  RETURN jsonb_build_object('result','retained'); END IF;
 -- No client secret is returned until bind_promotion_checkout succeeds. An
 -- unbound attempt cannot have exposed a payable checkout through this app.
 UPDATE private.promotion_redemptions SET state='released',attempt_number=attempt_number+1 WHERE id=r.id;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'promotion_unbound_attempt_released',jsonb_build_object('campaign_id',r.campaign_id,'reservation_id',r.id,'attempt_number',r.attempt_number,'attempt_started_at',r.attempt_started_at));
 RETURN jsonb_build_object('result','released');
END $function$;
REVOKE ALL ON FUNCTION public.release_unbound_promotion_reservation(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_unbound_promotion_reservation(uuid,timestamptz) TO service_role;

COMMIT;
