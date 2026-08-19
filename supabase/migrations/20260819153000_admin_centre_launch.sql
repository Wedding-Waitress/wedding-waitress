-- Launch Admin Centre: protected operational reporting, account controls and audit.
CREATE TABLE IF NOT EXISTS public.admin_account_controls (
  account_owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  reason text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text NOT NULL,
  previous_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  result text NOT NULL CHECK (result IN ('succeeded','failed')),
  safe_error_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_account_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner admin reads account controls" ON public.admin_account_controls FOR SELECT USING (public.is_owner_admin());
CREATE POLICY "Owner admin reads action audit" ON public.admin_action_audit FOR SELECT USING (public.is_owner_admin());
REVOKE ALL ON public.admin_account_controls, public.admin_action_audit FROM anon, authenticated;
GRANT SELECT ON public.admin_account_controls, public.admin_action_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.is_account_operational(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH owner AS (
    SELECT coalesce((SELECT am.account_owner_id FROM public.account_members am
      WHERE am.member_user_id=p_user_id AND am.access_disabled_at IS NULL
      ORDER BY (am.role='master') DESC,am.invited_at LIMIT 1),p_user_id) id
  ) SELECT
    coalesce((SELECT l.status NOT IN ('scheduled_for_deletion','permanently_deleted') FROM public.account_lifecycle l,owner o WHERE l.account_owner_id=o.id),true)
    AND coalesce((SELECT c.status<>'suspended' FROM public.admin_account_controls c,owner o WHERE c.account_owner_id=o.id),true);
$$;

CREATE OR REPLACE FUNCTION public.get_admin_centre_snapshot()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE payload jsonb;
BEGIN
  IF NOT public.is_owner_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object(
    'generated_at',now(),
    'customers',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.signup_date DESC) FROM (
      SELECT p.id,concat_ws(' ',p.first_name,p.last_name) full_name,p.email,p.mobile,p.created_at signup_date,
        u.email_confirmed_at,u.last_sign_in_at,
        CASE WHEN lower(coalesce(sp.name,'')) LIKE '%vendor%' THEN 'vendor' ELSE 'host' END customer_type,
        coalesce(c.status,'active') account_status,sp.name plan_name,us.status plan_status,us.started_at plan_started_at,us.expires_at plan_expires_at,
        (SELECT count(*) FROM public.events e WHERE e.user_id=p.id) event_count
      FROM public.profiles p JOIN auth.users u ON u.id=p.id
      LEFT JOIN LATERAL (SELECT x.* FROM public.user_subscriptions x WHERE x.user_id=p.id ORDER BY x.updated_at DESC LIMIT 1) us ON true
      LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
      LEFT JOIN public.admin_account_controls c ON c.account_owner_id=p.id
      LEFT JOIN public.account_lifecycle l ON l.account_owner_id=p.id
      WHERE coalesce(l.status,'active') NOT IN ('scheduled_for_deletion','permanently_deleted')
    ) q),'[]'::jsonb),
    'subscriptions',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM (
      SELECT us.id,us.user_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,sp.name plan_name,sp.price_aud,
        us.status subscription_status,CASE WHEN us.status IN ('past_due','unpaid') THEN us.status ELSE 'recorded' END payment_status,
        us.started_at,us.expires_at,us.created_at,us.is_read_only,
        CASE WHEN lower(sp.name) LIKE '%vendor%' AND us.status='pending_approval' THEN 'pending' ELSE 'not_applicable' END vendor_approval_status
      FROM public.user_subscriptions us JOIN public.subscription_plans sp ON sp.id=us.plan_id LEFT JOIN public.profiles p ON p.id=us.user_id
    ) q),'[]'::jsonb),
    'events',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM (
      SELECT e.id,e.user_id,e.name,e.event_type,e.date,e.venue,e.created_at,
        coalesce(e.event_date_override::text,e.date::text) effective_date,concat_ws(' ',p.first_name,p.last_name) owner_name,p.email owner_email,
        (SELECT count(*) FROM public.guests g WHERE g.event_id=e.id) guest_count,
        (SELECT count(*) FROM public.guests g WHERE g.event_id=e.id AND g.rsvp_invite_status<>'not_sent') invitations_sent,
        (SELECT count(*) FROM public.guests g WHERE g.event_id=e.id AND g.rsvp='attending') attending_count,
        sp.name plan_name,
        CASE WHEN coalesce(e.event_date_override,e.date)<current_date THEN 'completed' WHEN coalesce(e.event_date_override,e.date)>=current_date THEN 'upcoming' ELSE 'active' END event_status
      FROM public.events e LEFT JOIN public.profiles p ON p.id=e.user_id
      LEFT JOIN LATERAL (SELECT x.plan_id FROM public.user_subscriptions x WHERE x.user_id=e.user_id ORDER BY x.updated_at DESC LIMIT 1) us ON true
      LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
    ) q),'[]'::jsonb),
    'lifecycle',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.deletion_requested_at DESC NULLS LAST) FROM (
      SELECT l.account_owner_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,l.status,l.deletion_requested_at,l.purge_after,l.reactivated_at,
        l.stripe_cancellation_succeeded,l.deletion_processing_error,l.updated_at,sp.name previous_plan,
        CASE WHEN l.status='scheduled_for_deletion' THEN 'scheduled' WHEN l.status='permanently_deleted' THEN 'completed' ELSE 'not_due' END purge_status
      FROM public.account_lifecycle l LEFT JOIN public.profiles p ON p.id=l.account_owner_id
      LEFT JOIN LATERAL (SELECT x.plan_id FROM public.user_subscriptions x WHERE x.user_id=l.account_owner_id ORDER BY x.updated_at DESC LIMIT 1) us ON true
      LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
    ) q),'[]'::jsonb),
    'payments',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.payment_date DESC) FROM (
      SELECT ep.id,ep.user_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,'plan_purchase' payment_type,
        ep.amount_paid,ep.purchased_at payment_date,'succeeded' status,ep.stripe_payment_id stripe_reference,ep.payment_method
      FROM public.event_purchases ep LEFT JOIN public.profiles p ON p.id=ep.user_id
      UNION ALL
      SELECT rp.id,rp.user_id,concat_ws(' ',p.first_name,p.last_name),p.email,
        CASE WHEN rp.purchase_type='overage' THEN 'sms_top_up' ELSE 'rsvp_bundle' END,rp.amount_paid,rp.created_at,rp.status,
        coalesce(rp.stripe_payment_id,rp.stripe_session_id),NULL
      FROM public.rsvp_invite_purchases rp LEFT JOIN public.profiles p ON p.id=rp.user_id
    ) q),'[]'::jsonb),
    'recent_admin_actions',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM (SELECT id,administrator_id,action,target_type,target_id,result,created_at FROM public.admin_action_audit ORDER BY created_at DESC LIMIT 20) q),'[]'::jsonb),
    'configuration',jsonb_build_object('account_lifecycle',to_regprocedure('public.get_account_closure_admin_summary()') IS NOT NULL,'admin_actions',true,'stripe_live_data',false)
  ) INTO payload;
  RETURN payload;
END; $$;

REVOKE ALL ON FUNCTION public.get_admin_centre_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_centre_snapshot() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_account_control(p_target uuid,p_action text,p_reason text,p_actor uuid,p_safe_error_reference text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE before_state jsonb; after_state jsonb;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Administrator reason required'; END IF;
  SELECT coalesce(to_jsonb(c),jsonb_build_object('status','active')) INTO before_state FROM (SELECT * FROM public.admin_account_controls WHERE account_owner_id=p_target) c;
  IF p_action='suspend' THEN
    INSERT INTO public.admin_account_controls(account_owner_id,status,reason,changed_by) VALUES(p_target,'suspended',p_reason,p_actor)
    ON CONFLICT(account_owner_id) DO UPDATE SET status='suspended',reason=p_reason,changed_by=p_actor,changed_at=now();
  ELSIF p_action='restore' THEN
    INSERT INTO public.admin_account_controls(account_owner_id,status,reason,changed_by) VALUES(p_target,'active',p_reason,p_actor)
    ON CONFLICT(account_owner_id) DO UPDATE SET status='active',reason=p_reason,changed_by=p_actor,changed_at=now();
  ELSE RAISE EXCEPTION 'Unsupported account-control action'; END IF;
  SELECT to_jsonb(c) INTO after_state FROM public.admin_account_controls c WHERE account_owner_id=p_target;
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result,safe_error_reference)
  VALUES(p_actor,p_action,'account',p_target::text,p_reason,before_state,after_state,'succeeded',p_safe_error_reference);
  RETURN after_state;
END; $$;
REVOKE ALL ON FUNCTION public.admin_set_account_control(uuid,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_control(uuid,text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_lifecycle_action(p_target uuid,p_action text,p_reason text,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE before_state jsonb; after_state jsonb;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Administrator reason required'; END IF;
  SELECT to_jsonb(l) INTO before_state FROM public.account_lifecycle l WHERE l.account_owner_id=p_target FOR UPDATE;
  IF before_state IS NULL THEN RAISE EXCEPTION 'Lifecycle record not found'; END IF;
  IF p_action='reactivate_account' THEN
    IF (before_state->>'status')<>'scheduled_for_deletion' OR (before_state->>'purge_after')::timestamptz<=now() THEN RAISE EXCEPTION 'Account is not eligible for reactivation'; END IF;
    UPDATE public.account_lifecycle SET status='reactivated',reactivated_at=now(),updated_at=now() WHERE account_owner_id=p_target;
    UPDATE public.account_members SET access_disabled_at=NULL WHERE account_owner_id=p_target AND member_user_id=p_target AND role='master';
  ELSIF p_action='delay_permanent_deletion' THEN
    IF (before_state->>'status')<>'scheduled_for_deletion' THEN RAISE EXCEPTION 'Only scheduled accounts can be delayed'; END IF;
    UPDATE public.account_lifecycle SET purge_after=greatest(purge_after,now())+interval '30 days',updated_at=now() WHERE account_owner_id=p_target;
  ELSIF p_action='add_note' THEN
    UPDATE public.account_lifecycle SET audit_metadata=audit_metadata||jsonb_build_object('latest_admin_note',p_reason,'latest_admin_note_at',now(),'latest_admin_note_by',p_actor),updated_at=now() WHERE account_owner_id=p_target;
  ELSIF p_action='schedule_immediate_purge' THEN
    IF (before_state->>'status')<>'scheduled_for_deletion' THEN RAISE EXCEPTION 'Only scheduled accounts can be purged'; END IF;
    UPDATE public.account_lifecycle SET purge_after=now(),updated_at=now() WHERE account_owner_id=p_target;
  ELSE RAISE EXCEPTION 'Unsupported lifecycle action'; END IF;
  SELECT to_jsonb(l) INTO after_state FROM public.account_lifecycle l WHERE l.account_owner_id=p_target;
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata) VALUES(p_target,p_actor,p_action,jsonb_build_object('reason',p_reason));
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result) VALUES(p_actor,p_action,'account_lifecycle',p_target::text,p_reason,before_state,after_state,'succeeded');
  RETURN after_state;
END; $$;
REVOKE ALL ON FUNCTION public.admin_lifecycle_action(uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lifecycle_action(uuid,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_force_account_sign_out(p_target uuid,p_reason text,p_actor uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE removed integer;
BEGIN
  IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_reason,'')))<5 THEN RAISE EXCEPTION 'Administrator reason required'; END IF;
  DELETE FROM auth.sessions WHERE user_id=p_target;
  GET DIAGNOSTICS removed=ROW_COUNT;
  INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
  VALUES(p_actor,'force_sign_out','account',p_target::text,p_reason,jsonb_build_object('active_sessions','unknown'),jsonb_build_object('sessions_revoked',removed),'succeeded');
END; $$;
REVOKE ALL ON FUNCTION public.admin_force_account_sign_out(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_account_sign_out(uuid,text,uuid) TO service_role;
