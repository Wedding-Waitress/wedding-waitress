-- PREPARED ONLY. No refunds or production changes occur by applying source locally.
BEGIN;
CREATE TABLE public.admin_payment_refunds (
 id uuid PRIMARY KEY, administrator_id uuid NOT NULL REFERENCES auth.users(id),
 account_owner_id uuid NOT NULL REFERENCES auth.users(id), payment_type text NOT NULL,
 payment_id uuid NOT NULL, charge_id text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>0),
 currency text NOT NULL CHECK(currency='aud'), livemode boolean NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 1000),
 access_choice text NOT NULL CHECK(access_choice IN ('keep','suspend')),
 customer_reason text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'submitting' CHECK(status IN ('submitting','unknown','pending','requires_action','succeeded','failed','canceled')),
 stripe_refund_id text UNIQUE, access_status text NOT NULL DEFAULT 'unchanged' CHECK(access_status IN ('unchanged','waiting','suspended','incomplete')),
 access_attempted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(access_choice<>'suspend' OR length(btrim(customer_reason)) BETWEEN 5 AND 2000)
);
ALTER TABLE public.admin_payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_payment_refunds FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.admin_payment_refunds TO service_role;

CREATE FUNCTION public.admin_reserve_payment_refund(p_request jsonb,p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r public.admin_payment_refunds; request_id uuid:=(p_request->>'id')::uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT private.is_platform_owner(p_actor)
 OR NOT public.has_role(p_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'Owner service required' USING ERRCODE='42501'; END IF;
 IF private.is_platform_owner((p_request->>'account_owner_id')::uuid) THEN RAISE EXCEPTION 'Owner refund action prohibited'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('refund:'||(p_request->>'charge_id'),0));
 SELECT * INTO r FROM public.admin_payment_refunds WHERE id=request_id FOR UPDATE;
 IF FOUND THEN
  IF r.administrator_id<>p_actor OR r.charge_id<>p_request->>'charge_id' OR r.account_owner_id<>(p_request->>'account_owner_id')::uuid
   OR r.payment_id<>(p_request->>'payment_id')::uuid OR r.payment_type<>p_request->>'payment_type'
   OR r.amount_minor<>(p_request->>'amount_minor')::bigint OR r.access_choice<>p_request->>'access_choice'
   OR r.reason<>p_request->>'reason' OR r.customer_reason<>p_request->>'customer_reason'
   OR r.livemode<>(p_request->>'livemode')::boolean THEN RAISE EXCEPTION 'Refund request cannot be changed'; END IF;
  RETURN jsonb_build_object('is_new',false,'record',to_jsonb(r));
 END IF;
 IF EXISTS(SELECT 1 FROM public.admin_payment_refunds WHERE charge_id=p_request->>'charge_id' AND status IN ('submitting','unknown','pending','requires_action'))
 THEN RAISE EXCEPTION 'Reconcile the outstanding refund before another request'; END IF;
 INSERT INTO public.admin_payment_refunds(id,administrator_id,account_owner_id,payment_type,payment_id,charge_id,amount_minor,currency,livemode,reason,access_choice,customer_reason,access_status)
 VALUES(request_id,p_actor,(p_request->>'account_owner_id')::uuid,p_request->>'payment_type',(p_request->>'payment_id')::uuid,
 p_request->>'charge_id',(p_request->>'amount_minor')::bigint,'aud',(p_request->>'livemode')::boolean,p_request->>'reason',p_request->>'access_choice',p_request->>'customer_reason',
 CASE WHEN p_request->>'access_choice'='suspend' THEN 'waiting' ELSE 'unchanged' END) RETURNING * INTO r;
 INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
 VALUES(p_actor,'refund_requested','account',r.account_owner_id::text,r.reason,'{}',jsonb_build_object('request_id',r.id,'amount_minor',r.amount_minor,'access_choice',r.access_choice,'refund_status','submitting'),'succeeded');
 RETURN jsonb_build_object('is_new',true,'record',to_jsonb(r));
END $$;

CREATE FUNCTION public.admin_record_payment_refund(p_request_id uuid,p_refund_id text,p_status text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE r public.admin_payment_refunds; suspension jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service required' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT r FROM public.admin_payment_refunds WHERE id=p_request_id FOR UPDATE;
 IF p_status NOT IN ('pending','requires_action','succeeded','failed','canceled') OR p_refund_id !~ '^re_' THEN RAISE EXCEPTION 'Invalid refund result'; END IF;
 IF r.stripe_refund_id IS NOT NULL AND r.stripe_refund_id<>p_refund_id THEN RAISE EXCEPTION 'Refund identity mismatch'; END IF;
 -- Latest provider object is retrieved server-side. Ignore repeats and pending regressions.
 IF r.status=p_status OR (r.status IN ('succeeded','failed','canceled') AND p_status IN ('pending','requires_action')) THEN RETURN to_jsonb(r); END IF;
 UPDATE public.admin_payment_refunds SET stripe_refund_id=p_refund_id,status=p_status,updated_at=now() WHERE id=r.id;
 IF p_status='succeeded' AND r.access_choice='suspend' AND r.access_attempted_at IS NULL THEN
  BEGIN
   suspension:=public.admin_suspend_account(r.account_owner_id,r.customer_reason,r.reason,r.administrator_id);
   UPDATE public.admin_payment_refunds SET access_status=CASE WHEN suspension->>'sessions_revoked'='true' THEN 'suspended' ELSE 'incomplete' END,access_attempted_at=now() WHERE id=r.id;
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.admin_payment_refunds SET access_status='incomplete',access_attempted_at=now() WHERE id=r.id;
   INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
    VALUES(r.administrator_id,'refund_access_suspension','account',r.account_owner_id::text,r.reason,'{}',jsonb_build_object('request_id',r.id),'failed');
  END;
 END IF;
 IF p_status IN ('failed','canceled') AND r.access_attempted_at IS NULL THEN UPDATE public.admin_payment_refunds SET access_status='unchanged' WHERE id=r.id; END IF;
 IF r.status<>p_status THEN
 INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
 VALUES(r.administrator_id,'refund_status','account',r.account_owner_id::text,r.reason,jsonb_build_object('status',r.status),jsonb_build_object('request_id',r.id,'status',p_status),CASE WHEN p_status IN ('failed','canceled') THEN 'failed' ELSE 'succeeded' END);
 END IF;
 SELECT * INTO r FROM public.admin_payment_refunds WHERE id=r.id;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.admin_reserve_payment_refund(jsonb,uuid),public.admin_record_payment_refund(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reserve_payment_refund(jsonb,uuid),public.admin_record_payment_refund(uuid,text,text) TO service_role;
COMMIT;
