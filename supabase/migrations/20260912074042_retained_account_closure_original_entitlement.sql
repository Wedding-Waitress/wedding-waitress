-- PREPARED ONLY: future ordinary deactivation is not a privacy-erasure request.
-- Existing acknowledged deletion requests are deliberately not backfilled.
BEGIN;
ALTER TABLE public.account_lifecycle
  ADD COLUMN ordinary_closed_at timestamptz,
  ADD COLUMN original_paid_started_at timestamptz,
  ADD COLUMN original_paid_until timestamptz,
  ADD COLUMN original_paid_plan_id uuid;

CREATE FUNCTION public.deactivate_my_account() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=auth.uid(); lifecycle public.account_lifecycle; subscription public.user_subscriptions;
 claims jsonb; authenticated_at numeric;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 claims:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
 BEGIN authenticated_at:=nullif(claims->>'auth_time','')::numeric; EXCEPTION WHEN invalid_text_representation THEN authenticated_at:=NULL; END;
 IF authenticated_at IS NULL AND jsonb_typeof(claims->'amr')='array' THEN
  SELECT max((entry->>'timestamp')::numeric) INTO authenticated_at FROM jsonb_array_elements(claims->'amr') entry
  WHERE entry->>'method' IN ('otp','password','oauth','totp') AND jsonb_typeof(entry->'timestamp')='number';
 END IF;
 IF authenticated_at IS NULL OR authenticated_at>extract(epoch FROM now()) OR extract(epoch FROM now())-authenticated_at>600 THEN
  RAISE EXCEPTION 'Recent authentication is required' USING ERRCODE='42501'; END IF;
 -- Shared with reactivation/fulfillment to serialize first-time closure as well.
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=actor AND member_user_id=actor AND role='master')
 OR private.admin_customer_retention_required(actor) OR private.is_platform_owner(actor) THEN
  RAISE EXCEPTION 'Only an unrestricted account owner may close this account' USING ERRCODE='42501';
 END IF;
 SELECT * INTO lifecycle FROM public.account_lifecycle WHERE account_owner_id=actor FOR UPDATE;
 IF lifecycle.status='permanently_deleted' OR (lifecycle.status='scheduled_for_deletion' AND lifecycle.ordinary_closed_at IS NULL) THEN
  RAISE EXCEPTION 'This account requires owner review' USING ERRCODE='42501';
 END IF;
 IF lifecycle.status='scheduled_for_deletion' THEN RETURN public.get_my_account_lifecycle(); END IF;
 SELECT * INTO subscription FROM public.user_subscriptions WHERE user_id=actor ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
 INSERT INTO public.account_lifecycle(account_owner_id,status,deletion_requested_at,purge_after,deleted_by_user_id,
   ordinary_closed_at,original_paid_started_at,original_paid_until,original_paid_plan_id,audit_metadata)
 VALUES(actor,'scheduled_for_deletion',now(),'infinity',actor,now(),
   CASE WHEN subscription.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213') AND subscription.status IN ('active','cancelled') THEN subscription.started_at END,
   CASE WHEN subscription.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213') AND subscription.status IN ('active','cancelled') THEN subscription.expires_at END,
   CASE WHEN subscription.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213') AND subscription.status IN ('active','cancelled') THEN subscription.plan_id END,
   jsonb_build_object('source','ordinary_self_closure','retained',true))
 ON CONFLICT(account_owner_id) DO UPDATE SET status=EXCLUDED.status,deletion_requested_at=EXCLUDED.deletion_requested_at,
   purge_after=EXCLUDED.purge_after,deleted_by_user_id=actor,ordinary_closed_at=EXCLUDED.ordinary_closed_at,
   original_paid_started_at=EXCLUDED.original_paid_started_at,original_paid_until=EXCLUDED.original_paid_until,
   original_paid_plan_id=EXCLUDED.original_paid_plan_id,reactivated_at=NULL,audit_metadata=EXCLUDED.audit_metadata,updated_at=now();
 -- No subscription dates/status changes and no Stripe call: closure cannot pause,
 -- cancel the prepaid entitlement, refund, or extend it. Access is blocked separately.
 UPDATE public.account_members SET access_disabled_at=coalesce(access_disabled_at,now()) WHERE account_owner_id=actor;
 UPDATE public.account_invitations SET status='revoked' WHERE account_owner_id=actor AND status='pending';
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'ordinary_account_closed',jsonb_build_object('retained',true));
 RETURN public.get_my_account_lifecycle();
END $$;
REVOKE ALL ON FUNCTION public.deactivate_my_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.deactivate_my_account() TO authenticated;

CREATE FUNCTION public.get_my_account_return_eligibility() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=auth.uid(); lifecycle public.account_lifecycle; blocked boolean; closed boolean; valid boolean;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO lifecycle FROM public.account_lifecycle WHERE account_owner_id=actor;
 blocked:=private.admin_customer_retention_required(actor);
 closed:=coalesce(lifecycle.status='scheduled_for_deletion' AND lifecycle.ordinary_closed_at IS NOT NULL,false);
 valid:=coalesce(isfinite(lifecycle.original_paid_until) AND lifecycle.original_paid_until>now()
   AND EXISTS(SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=actor
     AND s.plan_id=lifecycle.original_paid_plan_id AND s.started_at=lifecycle.original_paid_started_at
     AND s.expires_at=lifecycle.original_paid_until AND s.status IN ('active','cancelled')),false);
 RETURN jsonb_build_object('account_closed',closed,'admin_blocked',blocked,'paid_until',lifecycle.original_paid_until,
   'server_now',now(),'can_reopen',closed AND NOT blocked AND valid,
   'renewal_required',closed AND NOT blocked AND NOT valid);
END $$;
REVOKE ALL ON FUNCTION public.get_my_account_return_eligibility() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_return_eligibility() TO authenticated;

ALTER FUNCTION public.reactivate_my_account() RENAME TO reactivate_my_account_legacy_deletion;
ALTER FUNCTION public.reactivate_my_account_legacy_deletion() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.reactivate_my_account_legacy_deletion() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reactivate_my_account() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=auth.uid(); lifecycle public.account_lifecycle; eligibility jsonb;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('account-return:'||actor::text,0));
 IF private.admin_customer_retention_required(actor) THEN
  RAISE EXCEPTION 'Only the platform owner may restore this account' USING ERRCODE='42501'; END IF;
 SELECT * INTO lifecycle FROM public.account_lifecycle WHERE account_owner_id=actor FOR UPDATE;
 -- Preserve separately acknowledged historical erasure/recovery behavior pending review.
 IF lifecycle.ordinary_closed_at IS NULL THEN RETURN private.reactivate_my_account_legacy_deletion(); END IF;
 IF lifecycle.status='reactivated' THEN RETURN public.get_my_account_lifecycle(); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=actor AND member_user_id=actor AND role='master') THEN
  RAISE EXCEPTION 'Account owner required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.user_subscriptions WHERE user_id=actor FOR UPDATE;
 eligibility:=public.get_my_account_return_eligibility();
 IF eligibility->>'can_reopen' IS DISTINCT FROM 'true' THEN
  RAISE EXCEPTION 'The original access period has ended. A verified package purchase is required.' USING ERRCODE='42501'; END IF;
 UPDATE public.account_lifecycle SET status='reactivated',reactivated_at=now(),updated_at=now() WHERE account_owner_id=actor;
 -- Cancellation of auto-renewal does not extinguish an unexpired prepaid term.
 UPDATE public.user_subscriptions SET status='active',is_read_only=false,updated_at=now()
 WHERE user_id=actor AND plan_id=lifecycle.original_paid_plan_id AND expires_at=lifecycle.original_paid_until;
 UPDATE public.account_members SET access_disabled_at=NULL WHERE account_owner_id=actor AND member_user_id=actor AND role='master';
 INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
 VALUES(actor,actor,'ordinary_account_reopened',jsonb_build_object('original_paid_until',lifecycle.original_paid_until));
 RETURN public.get_my_account_lifecycle();
END $$;
REVOKE ALL ON FUNCTION public.reactivate_my_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reactivate_my_account() TO authenticated;

-- Ordinary closure blocks content reads/writes for existing tokens as well as
-- page navigation. Retention is not an authorization grant.
CREATE FUNCTION private.closed_account_planning_blocked(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND status IN ('scheduled_for_deletion','permanently_deleted'))
 OR EXISTS(SELECT 1 FROM public.account_members m JOIN public.account_lifecycle l ON l.account_owner_id=m.account_owner_id
   WHERE m.member_user_id=p_user AND m.accepted_at IS NOT NULL AND l.status IN ('scheduled_for_deletion','permanently_deleted'));
$$;
REVOKE ALL ON FUNCTION private.closed_account_planning_blocked(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.closed_account_planning_blocked(uuid) TO authenticated,service_role;
DO $$ DECLARE relation regclass; BEGIN
 FOR relation IN SELECT DISTINCT p.polrelid::regclass FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage')
 AND p.polname IN ('Suspension blocks planning access','Suspension blocks table planning','Suspension blocks storage access') LOOP
  EXECUTE format('CREATE POLICY "Closed account blocks planning access" ON %s AS RESTRICTIVE FOR ALL TO authenticated USING (NOT private.closed_account_planning_blocked((SELECT auth.uid()))) WITH CHECK (NOT private.closed_account_planning_blocked((SELECT auth.uid())))',relation);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.guard_suspended_data_request() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE path text:=coalesce(current_setting('request.path',true),''); actor uuid:=auth.uid();
BEGIN
 IF auth.role()='authenticated' THEN
  IF (private.account_planning_blocked(actor) OR private.admin_deleted_planning_blocked(actor))
   AND path NOT IN ('/rpc/get_my_account_access','/rpc/reply_to_account_suspension','/rpc/is_account_operational','/rpc/get_my_account_lifecycle','/rpc/get_my_account_return_eligibility','/rpc/get_my_customer_entitlement') THEN
    RAISE EXCEPTION 'Account planning access is unavailable' USING ERRCODE='42501'; END IF;
  IF private.closed_account_planning_blocked(actor)
   AND path NOT IN ('/rpc/get_my_account_access','/rpc/get_my_account_lifecycle','/rpc/get_my_account_return_eligibility','/rpc/get_my_customer_entitlement',
     '/rpc/get_my_trial_state','/rpc/reactivate_my_account','/rpc/deactivate_my_account','/rpc/is_account_operational') THEN
    RAISE EXCEPTION 'This account is closed. Reopening or verified renewal is required.' USING ERRCODE='42501'; END IF;
 END IF;
END $$;
COMMIT;
