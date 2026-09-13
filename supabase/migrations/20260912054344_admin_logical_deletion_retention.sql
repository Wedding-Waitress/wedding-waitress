-- LOCAL/PREPARED ONLY. Admin deletion is logical, retained, and owner-restorable.
-- Customer-initiated closure retains its existing recovery/purge policy.
BEGIN;
ALTER TABLE public.account_lifecycle ADD COLUMN admin_deleted_at timestamptz;

-- Preserve earlier audited administrator closures, not customer closures.
UPDATE public.account_lifecycle l SET admin_deleted_at=l.deletion_requested_at, purge_after='infinity'
WHERE l.status='scheduled_for_deletion' AND l.audit_metadata->>'source'='verified_admin'
AND EXISTS (SELECT 1 FROM public.admin_action_audit a WHERE a.action='close_account'
  AND a.target_id=l.account_owner_id::text AND a.result='succeeded');

CREATE FUNCTION private.guard_admin_deleted_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.admin_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Administrator-retained account cannot be purged' USING ERRCODE='42501'; END IF;
    RETURN OLD;
  END IF;
  IF NEW.admin_deleted_at IS NOT NULL OR (TG_OP='UPDATE' AND OLD.admin_deleted_at IS NOT NULL) THEN
    BEGIN actor:=nullif(current_setting('app.admin_deleted_owner_action',true),'')::uuid; EXCEPTION WHEN invalid_text_representation THEN actor:=NULL; END;
    IF TG_OP='UPDATE' AND OLD.admin_deleted_at IS NOT NULL AND
       (NEW.admin_deleted_at IS DISTINCT FROM OLD.admin_deleted_at OR NEW.status IS DISTINCT FROM OLD.status
        OR NEW.account_owner_id IS DISTINCT FROM OLD.account_owner_id) THEN
      IF auth.role() IS DISTINCT FROM 'service_role' OR actor IS NULL
         OR NOT private.is_platform_owner(actor) OR NOT public.has_role(actor,'admin'::public.app_role)
         OR NEW.status<>'reactivated' OR NEW.admin_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Only the verified platform owner may restore this account' USING ERRCODE='42501';
      END IF;
    ELSIF (TG_OP='INSERT' OR OLD.admin_deleted_at IS NULL) AND NEW.admin_deleted_at IS NOT NULL THEN
      IF auth.role() IS DISTINCT FROM 'service_role' OR actor IS NULL
         OR NOT private.is_platform_owner(actor) OR NOT public.has_role(actor,'admin'::public.app_role)
         OR private.is_platform_owner(NEW.account_owner_id) THEN
        RAISE EXCEPTION 'Verified platform owner required' USING ERRCODE='42501';
      END IF;
    END IF;
    IF NEW.admin_deleted_at IS NOT NULL THEN
      IF NEW.status<>'scheduled_for_deletion' THEN RAISE EXCEPTION 'Administrator deletion must remain closed' USING ERRCODE='42501'; END IF;
      NEW.purge_after:='infinity';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.guard_admin_deleted_lifecycle() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_admin_deleted_lifecycle BEFORE INSERT OR UPDATE OR DELETE ON public.account_lifecycle
FOR EACH ROW EXECUTE FUNCTION private.guard_admin_deleted_lifecycle();

-- Retention is independent of sign-in/planning authorization: preserving data
-- never grants access. Suspended admin-controlled accounts are also never purged.
CREATE FUNCTION private.admin_customer_retention_required(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND admin_deleted_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.admin_account_controls WHERE account_owner_id=p_user AND status='suspended');
$$;
REVOKE ALL ON FUNCTION private.admin_customer_retention_required(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.is_admin_customer_retained(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 RETURN private.admin_customer_retention_required(p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.is_admin_customer_retained(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_customer_retained(uuid) TO service_role;

CREATE FUNCTION private.guard_admin_customer_record_retention() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE owner_id uuid; BEGIN
 IF TG_TABLE_SCHEMA='auth' OR TG_TABLE_NAME='profiles' THEN owner_id:=OLD.id;
 ELSIF TG_TABLE_NAME='events' THEN owner_id:=OLD.user_id;
 ELSE owner_id:=OLD.account_owner_id; END IF;
 IF private.admin_customer_retention_required(owner_id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Administrator-retained customer records cannot be deleted' USING ERRCODE='42501'; END IF;
  IF TG_TABLE_NAME='profiles' AND (
    NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name
    OR NEW.email IS DISTINCT FROM OLD.email OR NEW.mobile IS DISTINCT FROM OLD.mobile
    OR NEW.profile_image_path IS DISTINCT FROM OLD.profile_image_path) THEN
   RAISE EXCEPTION 'Administrator-retained customer identity cannot be anonymised or replaced' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION private.guard_admin_customer_record_retention() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_admin_customer_auth_retention BEFORE DELETE ON auth.users
 FOR EACH ROW EXECUTE FUNCTION private.guard_admin_customer_record_retention();
CREATE TRIGGER guard_admin_customer_profile_retention BEFORE UPDATE OR DELETE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION private.guard_admin_customer_record_retention();
CREATE TRIGGER guard_admin_customer_event_retention BEFORE DELETE ON public.events
 FOR EACH ROW EXECUTE FUNCTION private.guard_admin_customer_record_retention();
CREATE TRIGGER guard_admin_customer_control_retention BEFORE DELETE ON public.admin_account_controls
 FOR EACH ROW EXECUTE FUNCTION private.guard_admin_customer_record_retention();

ALTER FUNCTION public.complete_account_purge(uuid,jsonb) RENAME TO complete_account_purge_without_admin_retention;
ALTER FUNCTION public.complete_account_purge_without_admin_retention(uuid,jsonb) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.complete_account_purge_without_admin_retention(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.complete_account_purge(p_user_id uuid,p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF private.admin_customer_retention_required(p_user_id) THEN RAISE EXCEPTION 'Administrator-retained account cannot be purged' USING ERRCODE='42501'; END IF;
 PERFORM private.complete_account_purge_without_admin_retention(p_user_id,p_metadata);
END $$;
REVOKE ALL ON FUNCTION public.complete_account_purge(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_account_purge(uuid,jsonb) TO service_role;

CREATE FUNCTION private.admin_deleted_planning_blocked(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user AND admin_deleted_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.account_members m JOIN public.account_lifecycle l ON l.account_owner_id=m.account_owner_id
   WHERE m.member_user_id=p_user AND m.accepted_at IS NOT NULL AND m.access_disabled_at IS NULL AND l.admin_deleted_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION private.admin_deleted_planning_blocked(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.admin_deleted_planning_blocked(uuid) TO authenticated,service_role;
DO $$ DECLARE relation regclass; BEGIN
 FOR relation IN SELECT DISTINCT p.polrelid::regclass FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage')
 AND p.polname IN ('Suspension blocks planning access','Suspension blocks table planning','Suspension blocks storage access') LOOP
   EXECUTE format('CREATE POLICY "Admin deletion blocks planning access" ON %s AS RESTRICTIVE FOR ALL TO authenticated USING (NOT private.admin_deleted_planning_blocked((SELECT auth.uid()))) WITH CHECK (NOT private.admin_deleted_planning_blocked((SELECT auth.uid())))',relation);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.guard_suspended_data_request() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
BEGIN
 IF auth.role()='authenticated' AND (private.account_planning_blocked(auth.uid()) OR private.admin_deleted_planning_blocked(auth.uid()))
 AND coalesce(current_setting('request.path',true),'') NOT IN
 ('/rpc/get_my_account_access','/rpc/reply_to_account_suspension','/rpc/is_account_operational')
 AND NOT (private.admin_deleted_planning_blocked(auth.uid()) AND current_setting('request.path',true)='/rpc/get_my_account_lifecycle')
 THEN RAISE EXCEPTION 'Account planning access is unavailable' USING ERRCODE='42501'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.is_account_suspension_blocked(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
 SELECT private.account_planning_blocked(p_user_id) OR private.admin_deleted_planning_blocked(p_user_id);
$$;

ALTER FUNCTION public.get_my_account_access() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_my_account_access() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_my_account_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF private.admin_deleted_planning_blocked(auth.uid()) THEN RETURN jsonb_build_object('status','admin_deleted',
   'customer_reason','This account is deactivated. Information is retained for administration. Only the Wedding Waitress platform owner may restore access.'); END IF;
 RETURN private.get_my_account_access();
END $$;
REVOKE ALL ON FUNCTION public.get_my_account_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_access() TO authenticated;

-- Fail closed if revocation fails: keep the access block, record the partial
-- result, and return it explicitly rather than reporting complete success.
CREATE FUNCTION private.revoke_admin_blocked_sessions(p_target uuid,p_reason text,p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT private.is_platform_owner(p_actor)
   OR NOT public.has_role(p_actor,'admin'::public.app_role) THEN RAISE EXCEPTION 'Owner service required' USING ERRCODE='42501'; END IF;
 BEGIN
  PERFORM public.admin_force_account_sign_out(p_target,p_reason,p_actor);
  RETURN true;
 EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
   VALUES(p_actor,'blocked_account_session_revocation','account',p_target::text,p_reason,'{}',jsonb_build_object('sessions_revoked',false,'reference',gen_random_uuid()),'failed');
  RETURN false;
 END;
END $$;
REVOKE ALL ON FUNCTION private.revoke_admin_blocked_sessions(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.admin_suspend_account(uuid,text,text,uuid) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.admin_suspend_account(uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.admin_suspend_account(p_target uuid,p_customer_reason text,p_reason text,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE result jsonb; BEGIN
 result:=private.admin_suspend_account(p_target,p_customer_reason,p_reason,p_actor);
 RETURN result||jsonb_build_object('sessions_revoked',private.revoke_admin_blocked_sessions(p_target,p_reason,p_actor));
END $$;
REVOKE ALL ON FUNCTION public.admin_suspend_account(uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_account(uuid,text,text,uuid) TO service_role;

CREATE FUNCTION public.admin_logically_delete_account(p_target uuid,p_actor uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE before_state jsonb; after_state jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT private.is_platform_owner(p_actor)
    OR NOT public.has_role(p_actor,'admin'::public.app_role) OR private.is_platform_owner(p_target) THEN
    RAISE EXCEPTION 'Verified platform owner required' USING ERRCODE='42501'; END IF;
  IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Administrator reason required' USING ERRCODE='22023'; END IF;
  SELECT to_jsonb(l) INTO before_state FROM public.account_lifecycle l WHERE account_owner_id=p_target FOR UPDATE;
  IF before_state->>'status'='permanently_deleted' THEN RAISE EXCEPTION 'Previously erased information cannot be recovered'; END IF;
  PERFORM public.schedule_account_closure(p_target,true,NULL,jsonb_build_object('source','verified_admin','administrator_id',p_actor,'reason',p_reason));
  PERFORM set_config('app.admin_deleted_owner_action',p_actor::text,true);
  UPDATE public.account_lifecycle SET admin_deleted_at=coalesce(admin_deleted_at,now()),purge_after='infinity',updated_at=now()
    WHERE account_owner_id=p_target RETURNING to_jsonb(account_lifecycle) INTO after_state;
  PERFORM set_config('app.admin_deleted_owner_action','',true);
  after_state:=after_state||jsonb_build_object('sessions_revoked',private.revoke_admin_blocked_sessions(p_target,p_reason,p_actor));
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
    VALUES(p_actor,'admin_logical_deletion','account',p_target::text,p_reason,coalesce(before_state,'{}'),after_state,'succeeded');
  RETURN after_state;
END; $$;

CREATE FUNCTION public.admin_restore_deleted_account(p_target uuid,p_actor uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE row public.account_lifecycle; result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT private.is_platform_owner(p_actor)
    OR NOT public.has_role(p_actor,'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Verified platform owner required' USING ERRCODE='42501'; END IF;
  IF length(btrim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Administrator reason required' USING ERRCODE='22023'; END IF;
  SELECT * INTO row FROM public.account_lifecycle WHERE account_owner_id=p_target FOR UPDATE;
  IF row.admin_deleted_at IS NOT NULL THEN
    PERFORM set_config('app.admin_deleted_owner_action',p_actor::text,true);
    UPDATE public.account_lifecycle SET status='reactivated',admin_deleted_at=NULL,reactivated_at=now(),updated_at=now()
      WHERE account_owner_id=p_target;
    PERFORM set_config('app.admin_deleted_owner_action','',true);
    UPDATE public.account_members SET access_disabled_at=NULL WHERE account_owner_id=p_target AND member_user_id=p_target AND role='master';
    SELECT to_jsonb(l) INTO result FROM public.account_lifecycle l WHERE account_owner_id=p_target;
    INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata)
      VALUES(p_target,p_actor,'owner_restored_admin_deleted_account',jsonb_build_object('reason',p_reason,'previous_admin_deleted_at',row.admin_deleted_at));
    INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
      VALUES(p_actor,'reactivate_account','account_lifecycle',p_target::text,p_reason,to_jsonb(row),result,'succeeded');
    RETURN result;
  END IF;
  RETURN public.admin_lifecycle_action(p_target,'reactivate_account',p_reason,p_actor);
END; $$;
REVOKE ALL ON FUNCTION public.admin_logically_delete_account(uuid,uuid,text),public.admin_restore_deleted_account(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_logically_delete_account(uuid,uuid,text),public.admin_restore_deleted_account(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_due_account_purges(p_limit integer DEFAULT 50)
RETURNS SETOF public.account_lifecycle LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT * FROM public.account_lifecycle WHERE status='scheduled_for_deletion'
    AND admin_deleted_at IS NULL AND NOT private.admin_customer_retention_required(account_owner_id)
    AND purge_after<=now() ORDER BY purge_after LIMIT least(greatest(p_limit,1),100);
END; $$;

-- Keep the reviewed snapshot renderer and its checks, enriching only retained
-- customer rows and retention metadata. The base is private, not a second API.
ALTER FUNCTION public.get_admin_platform_snapshot() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_admin_platform_snapshot() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_admin_platform_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE snapshot jsonb; retained jsonb; lifecycle jsonb;
BEGIN
  IF NOT public.is_owner_admin() OR NOT private.is_platform_owner(auth.uid()) THEN RAISE EXCEPTION 'Owner administrator required' USING ERRCODE='42501'; END IF;
  snapshot:=private.get_admin_platform_snapshot();
  SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]') INTO retained FROM (
    SELECT p.id,concat_ws(' ',p.first_name,p.last_name) full_name,p.email,p.mobile,p.created_at signup_date,u.email_confirmed_at,u.last_sign_in_at,
      CASE WHEN lower(coalesce(sp.name,'')) LIKE '%vendor%' THEN 'vendor' ELSE 'host' END customer_type,l.status account_status,sp.name plan_name,us.status plan_status,us.started_at plan_started_at,us.expires_at plan_expires_at,
      (SELECT count(*) FROM public.events e WHERE e.user_id=p.id) event_count,
      (SELECT count(*) FROM public.guests g JOIN public.events e ON e.id=g.event_id WHERE e.user_id=p.id) guest_count,
      l.admin_deleted_at
    FROM public.account_lifecycle l JOIN public.profiles p ON p.id=l.account_owner_id JOIN auth.users u ON u.id=p.id
    LEFT JOIN LATERAL (SELECT x.* FROM public.user_subscriptions x WHERE x.user_id=p.id ORDER BY x.updated_at DESC LIMIT 1) us ON true
    LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
    WHERE l.status IN ('scheduled_for_deletion','permanently_deleted')
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'customers') c WHERE c->>'id'=p.id::text)
  ) q;
  SELECT coalesce(jsonb_agg(entry || jsonb_build_object('admin_deleted_at',l.admin_deleted_at,
    'purge_status',CASE WHEN l.admin_deleted_at IS NOT NULL THEN 'admin_retained' ELSE entry->>'purge_status' END)),'[]') INTO lifecycle
    FROM jsonb_array_elements(snapshot->'lifecycle') entry JOIN public.account_lifecycle l ON l.account_owner_id::text=entry->>'account_owner_id';
  RETURN jsonb_set(jsonb_set(snapshot,'{customers}',(snapshot->'customers')||retained),'{lifecycle}',lifecycle)
    || jsonb_build_object('admin_logical_deletion_ready',true);
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
