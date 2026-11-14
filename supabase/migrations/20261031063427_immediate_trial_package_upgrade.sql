-- Preserve terms for existing checkouts. New verified purchases opt in explicitly.
ALTER TABLE private.promotion_redemptions ADD COLUMN activation_policy text NOT NULL DEFAULT 'after_trial' CHECK (activation_policy IN ('after_trial','immediate'));
CREATE OR REPLACE FUNCTION public.reserve_first_purchase_promotion_now(p_user uuid,p_code text,p_plan text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $f$
DECLARE result jsonb;
BEGIN
 IF coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 result:=public.reserve_first_purchase_promotion(p_user,p_code,p_plan);
 UPDATE private.promotion_redemptions SET activation_policy='immediate' WHERE id=(result->>'id')::uuid AND state='reserved' AND stripe_session_id IS NULL;
 RETURN result;
END $f$;
REVOKE ALL ON FUNCTION public.reserve_first_purchase_promotion_now(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_first_purchase_promotion_now(uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.record_verified_promotion_completion(p_evidence jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth'
AS $function$
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
 started:=CASE WHEN r.activation_policy='immediate' THEN reference ELSE greatest(reference,r.original_trial_ends_at) END;
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
END $function$;


CREATE OR REPLACE FUNCTION private.enforce_trial_table_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $f$
DECLARE owner_id uuid; maximum integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.event_id IS NOT DISTINCT FROM OLD.event_id THEN RETURN NEW; END IF;
 SELECT user_id INTO owner_id FROM public.events WHERE id=NEW.event_id;
 IF owner_id IS NULL OR private.is_platform_owner(owner_id) THEN RETURN NEW; END IF;
 SELECT p.table_limit INTO maximum FROM public.user_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.user_id=owner_id AND p.name='Starter';
 IF maximum IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('trial-table-count:'||NEW.event_id::text,0));
 IF (SELECT count(*) FROM public.tables WHERE event_id=NEW.event_id AND id IS DISTINCT FROM NEW.id)>=maximum THEN RAISE EXCEPTION 'WW_TRIAL_TABLE_LIMIT_REACHED' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION private.enforce_trial_table_count() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_trial_table_count BEFORE INSERT OR UPDATE OF event_id ON public.tables FOR EACH ROW EXECUTE FUNCTION private.enforce_trial_table_count();
CREATE OR REPLACE FUNCTION private.sync_trial_guest_limit_after_package() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $f$
DECLARE trial_cap integer; package_cap integer;
BEGIN
 IF NEW.plan_id IS NOT DISTINCT FROM OLD.plan_id OR coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' THEN RETURN NEW; END IF;
 SELECT guest_limit INTO trial_cap FROM public.subscription_plans WHERE id=OLD.plan_id AND name='Starter';
 SELECT guest_limit INTO package_cap FROM public.subscription_plans WHERE id=NEW.plan_id AND name IN ('Essential','Premium','Unlimited');
 IF trial_cap IS NOT NULL AND package_cap>trial_cap THEN UPDATE public.events SET guest_limit=package_cap WHERE user_id=NEW.user_id AND guest_limit=trial_cap; END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION private.sync_trial_guest_limit_after_package() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_trial_guest_limit_after_package AFTER UPDATE OF plan_id ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION private.sync_trial_guest_limit_after_package();
