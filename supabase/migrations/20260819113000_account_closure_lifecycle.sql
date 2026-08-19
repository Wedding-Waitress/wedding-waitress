-- Recoverable account closure with a 12-month retention window.
CREATE TABLE IF NOT EXISTS public.account_lifecycle (
  account_owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','scheduled_for_deletion','reactivated','permanently_deleted')),
  deletion_requested_at timestamptz,
  purge_after timestamptz,
  reactivated_at timestamptz,
  deleted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_cancellation_succeeded boolean,
  stripe_cancellation_at timestamptz,
  deletion_processing_error text,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'scheduled_for_deletion' OR (deletion_requested_at IS NOT NULL AND purge_after IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.account_lifecycle_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.account_members ADD COLUMN IF NOT EXISTS access_disabled_at timestamptz;
ALTER TABLE public.account_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lifecycle_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own lifecycle" ON public.account_lifecycle FOR SELECT USING (auth.uid() = account_owner_id);
CREATE POLICY "Owner admin reads lifecycle" ON public.account_lifecycle FOR SELECT USING (public.is_owner_admin());
CREATE POLICY "Owner admin reads lifecycle audit" ON public.account_lifecycle_audit FOR SELECT USING (public.is_owner_admin());

CREATE OR REPLACE FUNCTION public.get_my_account_lifecycle()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(to_jsonb(l), jsonb_build_object('account_owner_id', auth.uid(), 'status', 'active'))
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN public.account_lifecycle l ON l.account_owner_id = me.uid;
$$;

CREATE OR REPLACE FUNCTION public.is_account_operational(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce((
    SELECT l.status NOT IN ('scheduled_for_deletion','permanently_deleted')
    FROM public.account_lifecycle l
    WHERE l.account_owner_id = coalesce((
      SELECT am.account_owner_id FROM public.account_members am
      WHERE am.member_user_id = p_user_id AND am.access_disabled_at IS NULL
      ORDER BY (am.role = 'master') DESC, am.invited_at LIMIT 1
    ), p_user_id)
  ), true);
$$;

CREATE POLICY "Operational accounts create and manage events" ON public.events AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_account_operational(auth.uid())) WITH CHECK (public.is_account_operational(auth.uid()));
CREATE POLICY "Operational accounts create and manage guests" ON public.guests AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_account_operational(auth.uid())) WITH CHECK (public.is_account_operational(auth.uid()));
CREATE POLICY "Operational accounts manage team invitations" ON public.account_invitations AS RESTRICTIVE FOR ALL TO authenticated
USING (public.is_account_operational(auth.uid())) WITH CHECK (public.is_account_operational(auth.uid()));

CREATE OR REPLACE FUNCTION public.can_access_event(_user_id uuid,_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.has_role(_user_id,'admin'::public.app_role)
  OR EXISTS(SELECT 1 FROM public.events e WHERE e.id=_event_id AND e.user_id=_user_id AND public.is_account_operational(_user_id))
  OR EXISTS(SELECT 1 FROM public.event_collaborators ec JOIN public.events e ON e.id=ec.event_id WHERE ec.event_id=_event_id AND ec.user_id=_user_id AND public.is_account_operational(e.user_id))
  OR EXISTS(SELECT 1 FROM public.account_members am JOIN public.events e ON e.user_id=am.account_owner_id WHERE am.member_user_id=_user_id AND am.access_disabled_at IS NULL AND e.id=_event_id AND public.is_account_operational(am.account_owner_id));
$$;

CREATE OR REPLACE FUNCTION public.schedule_account_closure(
  p_user_id uuid, p_stripe_cancelled boolean, p_processing_error text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE current_row public.account_lifecycle; owner_ok boolean;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.account_members WHERE account_owner_id=p_user_id AND member_user_id=p_user_id AND role='master') INTO owner_ok;
  IF NOT owner_ok THEN RAISE EXCEPTION 'Account owner required' USING ERRCODE='42501'; END IF;
  SELECT * INTO current_row FROM public.account_lifecycle WHERE account_owner_id=p_user_id FOR UPDATE;
  IF current_row.status = 'permanently_deleted' THEN RAISE EXCEPTION 'Account retention deadline has passed'; END IF;
  IF current_row.status = 'scheduled_for_deletion' THEN RETURN to_jsonb(current_row); END IF;
  INSERT INTO public.account_lifecycle(account_owner_id,status,deletion_requested_at,purge_after,deleted_by_user_id,stripe_cancellation_succeeded,stripe_cancellation_at,deletion_processing_error,audit_metadata)
  VALUES(p_user_id,'scheduled_for_deletion',now(),now()+interval '12 months',p_user_id,p_stripe_cancelled,CASE WHEN p_stripe_cancelled THEN now() END,left(p_processing_error,1000),p_metadata)
  ON CONFLICT(account_owner_id) DO UPDATE SET status='scheduled_for_deletion',deletion_requested_at=now(),purge_after=now()+interval '12 months',reactivated_at=NULL,deleted_by_user_id=p_user_id,stripe_cancellation_succeeded=p_stripe_cancelled,stripe_cancellation_at=CASE WHEN p_stripe_cancelled THEN now() END,deletion_processing_error=left(p_processing_error,1000),audit_metadata=p_metadata,updated_at=now()
  RETURNING * INTO current_row;
  UPDATE public.user_subscriptions SET status='cancelled',is_read_only=true,updated_at=now() WHERE user_id=p_user_id;
  UPDATE public.account_members SET access_disabled_at=now() WHERE account_owner_id=p_user_id;
  UPDATE public.account_invitations SET status='revoked' WHERE account_owner_id=p_user_id AND status='pending';
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action,metadata) VALUES(p_user_id,p_user_id,'scheduled_for_deletion',p_metadata);
  RETURN to_jsonb(current_row);
END; $$;

CREATE OR REPLACE FUNCTION public.reactivate_my_account()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE row public.account_lifecycle;
BEGIN
  SELECT * INTO row FROM public.account_lifecycle WHERE account_owner_id=auth.uid() FOR UPDATE;
  IF row.account_owner_id IS NULL OR row.status <> 'scheduled_for_deletion' THEN RAISE EXCEPTION 'Account is not awaiting reactivation'; END IF;
  IF row.purge_after <= now() THEN RAISE EXCEPTION 'The account recovery period has ended'; END IF;
  UPDATE public.account_lifecycle SET status='reactivated',reactivated_at=now(),updated_at=now() WHERE account_owner_id=auth.uid() RETURNING * INTO row;
  UPDATE public.account_members SET access_disabled_at=NULL WHERE account_owner_id=auth.uid() AND member_user_id=auth.uid() AND role='master';
  INSERT INTO public.account_lifecycle_audit(account_owner_id,actor_user_id,action) VALUES(auth.uid(),auth.uid(),'reactivated');
  RETURN to_jsonb(row);
END; $$;

CREATE OR REPLACE FUNCTION public.get_account_closure_admin_summary()
RETURNS TABLE(account_owner_id uuid,email text,full_name text,status text,deletion_requested_at timestamptz,purge_after timestamptz,reactivated_at timestamptz,plan_status text,stripe_cancellation_succeeded boolean,deletion_processing_error text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_owner_admin() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT l.account_owner_id,p.email,concat_ws(' ',p.first_name,p.last_name),l.status,l.deletion_requested_at,l.purge_after,l.reactivated_at,us.status,l.stripe_cancellation_succeeded,l.deletion_processing_error
  FROM public.account_lifecycle l LEFT JOIN public.profiles p ON p.id=l.account_owner_id LEFT JOIN public.user_subscriptions us ON us.user_id=l.account_owner_id ORDER BY l.deletion_requested_at DESC NULLS LAST;
END; $$;

CREATE OR REPLACE FUNCTION public.get_due_account_purges(p_limit integer DEFAULT 50)
RETURNS SETOF public.account_lifecycle LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT * FROM public.account_lifecycle WHERE status='scheduled_for_deletion' AND purge_after<=now() ORDER BY purge_after LIMIT least(greatest(p_limit,1),100);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_account_purge(p_user_id uuid,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=p_user_id AND status='scheduled_for_deletion' AND purge_after<=now()) THEN RAISE EXCEPTION 'Account is not eligible for purge'; END IF;
  DELETE FROM public.account_invitations WHERE account_owner_id=p_user_id;
  DELETE FROM public.account_members WHERE account_owner_id=p_user_id;
  DELETE FROM public.events WHERE user_id=p_user_id;
  UPDATE public.profiles SET first_name=NULL,last_name=NULL,email=NULL,mobile=NULL,profile_image_path=NULL WHERE id=p_user_id;
  UPDATE public.account_lifecycle SET status='permanently_deleted',audit_metadata=audit_metadata||p_metadata,updated_at=now() WHERE account_owner_id=p_user_id;
  INSERT INTO public.account_lifecycle_audit(account_owner_id,action,metadata) VALUES(p_user_id,'permanently_deleted',p_metadata);
END; $$;

REVOKE ALL ON public.account_lifecycle,public.account_lifecycle_audit FROM anon,authenticated;
GRANT SELECT ON public.account_lifecycle TO authenticated;
REVOKE ALL ON FUNCTION public.schedule_account_closure(uuid,boolean,text,jsonb),public.get_due_account_purges(integer),public.complete_account_purge(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_account_closure(uuid,boolean,text,jsonb),public.get_due_account_purges(integer),public.complete_account_purge(uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_account_lifecycle(),public.is_account_operational(uuid),public.reactivate_my_account(),public.get_account_closure_admin_summary() TO authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN PERFORM cron.unschedule('purge-closed-wedding-waitress-accounts'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-closed-wedding-waitress-accounts','30 3 * * *',
  $$SELECT net.http_post(url:=current_setting('app.settings.supabase_url')||'/functions/v1/purge-closed-accounts',headers:=jsonb_build_object('Authorization','Bearer '||current_setting('app.settings.service_role_key'),'Content-Type','application/json'),body:='{}'::jsonb);$$);
