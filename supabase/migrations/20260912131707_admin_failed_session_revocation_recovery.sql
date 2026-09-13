-- PREPARED ONLY: recover only the missing session-revocation step of an
-- already blocked account. Never replay suspension, deletion, restoration,
-- billing, queued messages or customer notifications.
BEGIN;
CREATE TABLE private.admin_session_revocation_recovery (
 failure_audit_id uuid PRIMARY KEY REFERENCES public.admin_action_audit(id),
 recovered_by uuid NOT NULL,
 recovered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.admin_session_revocation_recovery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.admin_session_revocation_recovery FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.admin_retry_failed_session_revocation(p_failure_audit_id uuid,p_actor uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE failure public.admin_action_audit; target uuid; reference uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT private.is_platform_owner(p_actor)
   OR NOT public.has_role(p_actor,'admin'::public.app_role) THEN
  RAISE EXCEPTION 'Verified owner service required' USING ERRCODE='42501';
 END IF;
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 1000 THEN
  RAISE EXCEPTION 'Audit reason required' USING ERRCODE='22023';
 END IF;
 SELECT * INTO failure FROM public.admin_action_audit WHERE id=p_failure_audit_id FOR UPDATE;
 IF NOT FOUND OR failure.result<>'failed' OR failure.action<>'blocked_account_session_revocation'
   OR failure.target_type<>'account' THEN
  RAISE EXCEPTION 'This failure cannot be safely replayed' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM private.admin_session_revocation_recovery WHERE failure_audit_id=p_failure_audit_id) THEN
  RETURN jsonb_build_object('result','already_recovered','failure_audit_id',p_failure_audit_id);
 END IF;
 target:=failure.target_id::uuid;
 IF private.is_platform_owner(target) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target) THEN
  RAISE EXCEPTION 'Recovery target is unavailable' USING ERRCODE='42501';
 END IF;
 -- Restoration changes these same rows: serialize the state check and revoke.
 PERFORM 1 FROM public.admin_account_controls WHERE account_owner_id=target FOR UPDATE;
 PERFORM 1 FROM public.account_lifecycle WHERE account_owner_id=target FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.admin_account_controls WHERE account_owner_id=target AND status='suspended')
   AND NOT private.admin_deleted_planning_blocked(target) THEN
  RAISE EXCEPTION 'The account is no longer blocked; recovery refused' USING ERRCODE='42501';
 END IF;
 BEGIN
  PERFORM public.admin_force_account_sign_out(target,p_reason,p_actor);
  INSERT INTO private.admin_session_revocation_recovery(failure_audit_id,recovered_by)
   VALUES(p_failure_audit_id,p_actor);
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
   VALUES(p_actor,'retry_session_revocation','account',target::text,btrim(p_reason),
    jsonb_build_object('failure_audit_id',p_failure_audit_id),jsonb_build_object('sessions_revoked',true),'succeeded');
  RETURN jsonb_build_object('result','recovered','failure_audit_id',p_failure_audit_id);
 EXCEPTION WHEN OTHERS THEN
  reference:=gen_random_uuid();
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
   VALUES(p_actor,'retry_session_revocation','account',target::text,btrim(p_reason),
    jsonb_build_object('failure_audit_id',p_failure_audit_id),jsonb_build_object('reference',reference),'failed');
  RETURN jsonb_build_object('result','failed','reference',reference);
 END;
END $$;
REVOKE ALL ON FUNCTION public.admin_retry_failed_session_revocation(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_retry_failed_session_revocation(uuid,uuid,text) TO service_role;
COMMIT;
