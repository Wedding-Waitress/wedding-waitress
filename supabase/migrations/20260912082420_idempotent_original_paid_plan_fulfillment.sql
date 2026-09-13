-- PREPARED ONLY. No Stripe catalogue changes or historical paid grants.
-- Amounts are the already approved website's AUD ex-GST couple catalogue,
-- not the older subscription_plans.price_aud values. Reconcile that legacy
-- display catalogue before activating live checkout; never infer past payment.
BEGIN;
CREATE TABLE public.paid_plan_purchases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 stripe_session_id text NOT NULL UNIQUE CHECK(stripe_session_id ~ '^cs_[A-Za-z0-9_]+$'),
 stripe_payment_intent_id text NOT NULL UNIQUE CHECK(stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
 plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
 purpose text NOT NULL CHECK(purpose IN ('new_plan','renewal','upgrade')),
 currency text NOT NULL CHECK(currency='AUD'),
 amount_subtotal_cents integer NOT NULL CHECK(amount_subtotal_cents>0),
 amount_total_cents integer NOT NULL CHECK(amount_total_cents>=amount_subtotal_cents),
 catalogue_version text NOT NULL CHECK(catalogue_version='ww-aud-couple-20260909'),
 payment_reference_at timestamptz NOT NULL CHECK(isfinite(payment_reference_at)),
 term_started_at timestamptz NOT NULL CHECK(isfinite(term_started_at)),
 term_expires_at timestamptz NOT NULL CHECK(isfinite(term_expires_at) AND term_expires_at>term_started_at),
 fulfilled_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX paid_plan_purchases_user_fulfilled_idx ON public.paid_plan_purchases(user_id,fulfilled_at DESC);
ALTER TABLE public.paid_plan_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.paid_plan_purchases FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.paid_plan_purchases TO authenticated;
GRANT SELECT,INSERT ON public.paid_plan_purchases TO service_role;
CREATE POLICY "Master reads own verified plan purchases" ON public.paid_plan_purchases FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.account_members m
 WHERE m.account_owner_id=user_id AND m.member_user_id=(SELECT auth.uid()) AND m.role='master' AND m.accepted_at IS NOT NULL));
CREATE POLICY "Verified owner administrator reads plan purchases" ON public.paid_plan_purchases FOR SELECT TO authenticated
 USING(private.is_platform_owner((SELECT auth.uid())) AND public.is_owner_admin());

CREATE FUNCTION public.fulfill_paid_plan_purchase(
 _user_id uuid,_stripe_session_id text,_stripe_payment_intent_id text,_plan_id uuid,_purpose text,
 _amount_subtotal_cents integer,_amount_total_cents integer,_currency text,_payment_status text,
 _payment_reference_at timestamptz,_catalogue_version text,_is_live boolean,_previous_plan_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE previous public.user_subscriptions; lifecycle public.account_lifecycle; existing public.paid_plan_purchases;
 expected integer; previous_amount integer; started timestamptz; deadline timestamptz; closed boolean;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN
  RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF _payment_status IS DISTINCT FROM 'paid' OR _is_live IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'A verified successful live payment is required' USING ERRCODE='42501'; END IF;
 IF _user_id IS NULL OR _stripe_session_id IS NULL OR _stripe_session_id !~ '^cs_[A-Za-z0-9_]+$'
 OR _stripe_payment_intent_id IS NULL OR _stripe_payment_intent_id !~ '^pi_[A-Za-z0-9]+$'
 OR _purpose IS NULL OR _purpose NOT IN ('new_plan','renewal','upgrade')
 OR _currency IS DISTINCT FROM 'AUD' OR _catalogue_version IS DISTINCT FROM 'ww-aud-couple-20260909'
 OR _payment_reference_at IS NULL OR NOT isfinite(_payment_reference_at) OR _payment_reference_at>now()
 OR _amount_subtotal_cents IS NULL OR _amount_total_cents IS NULL OR _amount_total_cents<_amount_subtotal_cents THEN
  RAISE EXCEPTION 'Payment evidence is incomplete or invalid' USING ERRCODE='22023'; END IF;
 SELECT amount INTO expected FROM (VALUES
  ('78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,19900),
  ('1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,24900),
  ('cd10f207-2109-4546-a635-0baa68ba8213'::uuid,29900)) approved(id,amount) WHERE id=_plan_id;
 IF expected IS NULL OR NOT EXISTS(SELECT 1 FROM public.subscription_plans WHERE id=_plan_id AND is_active) THEN
  RAISE EXCEPTION 'An existing approved couple plan is required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||_user_id::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('paid-plan-session:'||_stripe_session_id,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('paid-plan-intent:'||_stripe_payment_intent_id,0));
 -- Always recheck administrative restrictions, even for a recorded replay.
 IF private.account_planning_blocked(_user_id) OR private.admin_deleted_planning_blocked(_user_id)
 OR NOT EXISTS(SELECT 1 FROM public.account_members m WHERE m.account_owner_id=_user_id AND m.member_user_id=_user_id
  AND m.role='master' AND m.accepted_at IS NOT NULL AND (m.access_disabled_at IS NULL OR EXISTS(
   SELECT 1 FROM public.account_lifecycle l WHERE l.account_owner_id=_user_id AND l.status='scheduled_for_deletion'
   AND l.ordinary_closed_at IS NOT NULL AND l.admin_deleted_at IS NULL)))
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_user_id AND created_at<=_payment_reference_at) THEN
  RAISE EXCEPTION 'Only an unrestricted operational account master may fulfill payment' USING ERRCODE='42501'; END IF;
 SELECT * INTO existing FROM public.paid_plan_purchases WHERE stripe_session_id=_stripe_session_id OR stripe_payment_intent_id=_stripe_payment_intent_id;
 IF FOUND THEN
  IF existing.user_id IS DISTINCT FROM _user_id OR existing.stripe_session_id IS DISTINCT FROM _stripe_session_id
  OR existing.stripe_payment_intent_id IS DISTINCT FROM _stripe_payment_intent_id OR existing.plan_id IS DISTINCT FROM _plan_id
  OR existing.purpose IS DISTINCT FROM _purpose OR existing.amount_subtotal_cents IS DISTINCT FROM _amount_subtotal_cents
  OR existing.amount_total_cents IS DISTINCT FROM _amount_total_cents OR existing.payment_reference_at IS DISTINCT FROM _payment_reference_at THEN
   RAISE EXCEPTION 'Payment is already bound to different fulfillment evidence' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('result','already_fulfilled','plan_id',existing.plan_id,'started_at',existing.term_started_at,
   'expires_at',existing.term_expires_at,'status',CASE WHEN now()<existing.term_expires_at THEN 'active' ELSE 'expired' END);
 END IF;
 SELECT * INTO previous FROM public.user_subscriptions WHERE user_id=_user_id FOR UPDATE;
 SELECT * INTO lifecycle FROM public.account_lifecycle WHERE account_owner_id=_user_id FOR UPDATE;
 closed:=coalesce(lifecycle.status='scheduled_for_deletion',false);
 IF lifecycle.status='permanently_deleted' OR closed AND lifecycle.ordinary_closed_at IS NULL THEN
  RAISE EXCEPTION 'Historical deletion requires owner review' USING ERRCODE='42501'; END IF;
 IF _purpose='upgrade' THEN
  SELECT amount INTO previous_amount FROM (VALUES
   ('78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,19900),
   ('1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,24900)) approved(id,amount) WHERE id=previous.plan_id;
  IF closed OR previous_amount IS NULL OR previous.plan_id IS DISTINCT FROM _previous_plan_id
  OR previous.status NOT IN ('active','cancelled') OR previous.is_read_only
  OR NOT isfinite(previous.expires_at) OR previous.expires_at<=now() OR expected<=previous_amount THEN
   RAISE EXCEPTION 'A current original lower-capacity paid term is required' USING ERRCODE='42501'; END IF;
  expected:=expected-previous_amount;started:=previous.started_at;deadline:=previous.expires_at;
 ELSE
  IF previous.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')
  AND isfinite(previous.expires_at) AND previous.expires_at>now() THEN
   RAISE EXCEPTION 'An unexpired original paid term must not be repurchased or extended' USING ERRCODE='42501'; END IF;
  IF previous.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213')
  AND _payment_reference_at<previous.expires_at THEN
   RAISE EXCEPTION 'An earlier payment cannot replace a later original term' USING ERRCODE='42501'; END IF;
  IF closed AND _purpose<>'renewal' THEN RAISE EXCEPTION 'Closed accounts require an explicitly consented renewal' USING ERRCODE='42501'; END IF;
  started:=_payment_reference_at;deadline:=((started AT TIME ZONE 'UTC')+interval '12 months') AT TIME ZONE 'UTC';
 END IF;
 IF _amount_subtotal_cents IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Payment does not match the approved AUD catalogue' USING ERRCODE='22023'; END IF;
 INSERT INTO public.paid_plan_purchases(user_id,stripe_session_id,stripe_payment_intent_id,plan_id,purpose,currency,
  amount_subtotal_cents,amount_total_cents,catalogue_version,payment_reference_at,term_started_at,term_expires_at)
 VALUES(_user_id,_stripe_session_id,_stripe_payment_intent_id,_plan_id,_purpose,'AUD',_amount_subtotal_cents,_amount_total_cents,_catalogue_version,_payment_reference_at,started,deadline);
 INSERT INTO public.user_subscriptions(user_id,plan_id,started_at,expires_at,status,is_read_only)
 VALUES(_user_id,_plan_id,started,deadline,CASE WHEN now()<deadline THEN 'active' ELSE 'expired' END,now()>=deadline)
 ON CONFLICT(user_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,started_at=EXCLUDED.started_at,expires_at=EXCLUDED.expires_at,
  status=EXCLUDED.status,is_read_only=EXCLUDED.is_read_only,grace_period_ends_at=NULL,updated_at=now();
 IF closed THEN
  UPDATE public.account_lifecycle SET status='reactivated',reactivated_at=now(),updated_at=now() WHERE account_owner_id=_user_id;
  UPDATE public.account_members SET access_disabled_at=NULL WHERE account_owner_id=_user_id AND member_user_id=_user_id AND role='master';
 END IF;
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(_user_id,_user_id,'verified_paid_plan_fulfilled',jsonb_build_object('purpose',_purpose,'plan_id',_plan_id,'started_at',started,'expires_at',deadline,'source','verified_payment_service'));
 RETURN jsonb_build_object('result','fulfilled','plan_id',_plan_id,'started_at',started,'expires_at',deadline,'status',CASE WHEN now()<deadline THEN 'active' ELSE 'expired' END);
END $$;
REVOKE ALL ON FUNCTION public.fulfill_paid_plan_purchase(uuid,text,text,uuid,text,integer,integer,text,text,timestamptz,text,boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_plan_purchase(uuid,text,text,uuid,text,integer,integer,text,text,timestamptz,text,boolean,uuid) TO service_role;
COMMIT;
