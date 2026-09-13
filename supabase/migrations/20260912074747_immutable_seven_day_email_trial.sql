-- PREPARED ONLY. Eligibility survives Auth deletion/recreation; this registry
-- is private and is not a public customer directory. No name/fingerprint checks.
BEGIN;
-- Access expiry is not an erasure request. Withdraw optional expiry-cleanup
-- entry points even if an older worker is still running. Never activate the
-- unrelated prepaid-extension/cleanup migrations to satisfy this dependency.
DO $$ DECLARE signature text; BEGIN
 FOREACH signature IN ARRAY ARRAY['public.schedule_access_recovery_cleanup()',
  'public.claim_access_recovery_cleanup(integer)','public.prepare_expired_access_purge(bigint)',
  'public.get_access_recovery_storage_objects(bigint)'] LOOP
  IF to_regprocedure(signature) IS NOT NULL THEN
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',to_regprocedure(signature));
  END IF;
 END LOOP;
END $$;
CREATE TABLE private.email_trial_history (
 normalized_email text PRIMARY KEY CHECK(normalized_email=lower(btrim(normalized_email)) AND normalized_email<>''),
 first_signup_at timestamptz NOT NULL CHECK(isfinite(first_signup_at)),
 trial_ends_at timestamptz GENERATED ALWAYS AS (((first_signup_at AT TIME ZONE 'UTC') + interval '604800 seconds') AT TIME ZONE 'UTC') STORED
);
CREATE TABLE private.account_trial_history (
 account_user_id uuid PRIMARY KEY,
 first_signup_at timestamptz NOT NULL CHECK(isfinite(first_signup_at)),
 trial_ends_at timestamptz GENERATED ALWAYS AS (((first_signup_at AT TIME ZONE 'UTC') + interval '604800 seconds') AT TIME ZONE 'UTC') STORED
);
ALTER TABLE private.email_trial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.account_trial_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.email_trial_history,private.account_trial_history FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.account_trial_emails (
 account_user_id uuid NOT NULL,
 normalized_email text NOT NULL REFERENCES private.email_trial_history(normalized_email) ON DELETE RESTRICT,
 PRIMARY KEY(account_user_id,normalized_email)
);
CREATE INDEX account_trial_emails_normalized_idx ON private.account_trial_emails(normalized_email,account_user_id);
ALTER TABLE private.account_trial_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_trial_emails FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.register_account_trial(p_user uuid,p_email text,p_signup timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE normalized text:=lower(btrim(p_email)); original timestamptz; email_start timestamptz; linked_ids uuid[]; starter_id uuid;
BEGIN
 IF normalized IS NULL OR normalized='' THEN RETURN; END IF;
 IF p_signup IS NULL OR NOT isfinite(p_signup) THEN RAISE EXCEPTION 'Authoritative signup timestamp required'; END IF;
 -- Alias changes can merge several histories. Serialize this small registry so
 -- concurrent merges cannot commit incompatible earliest-start decisions.
 PERFORM pg_advisory_xact_lock(hashtextextended('immutable-email-trial-registry',0));
 SELECT id INTO starter_id FROM public.subscription_plans WHERE name='Starter' AND price_aud=0 AND is_active;
 IF starter_id IS NULL OR (SELECT count(*) FROM public.subscription_plans WHERE name='Starter' AND price_aud=0 AND is_active)<>1 THEN
  RAISE EXCEPTION 'Exactly one existing free Starter plan is required';
 END IF;
 -- Same normalized email is serialized by its unique row even under concurrent signup.
 SELECT first_signup_at INTO original FROM private.account_trial_history WHERE account_user_id=p_user;
 original:=least(coalesce(original,p_signup),p_signup);
 INSERT INTO private.email_trial_history(normalized_email,first_signup_at) VALUES(normalized,original)
 ON CONFLICT(normalized_email) DO UPDATE SET first_signup_at=least(private.email_trial_history.first_signup_at,EXCLUDED.first_signup_at)
 RETURNING first_signup_at INTO email_start;
 INSERT INTO private.account_trial_emails(account_user_id,normalized_email) VALUES(p_user,normalized) ON CONFLICT DO NOTHING;
 INSERT INTO private.account_trial_history(account_user_id,first_signup_at) VALUES(p_user,least(original,email_start))
 ON CONFLICT(account_user_id) DO UPDATE SET first_signup_at=least(private.account_trial_history.first_signup_at,EXCLUDED.first_signup_at);
 -- Signup transactions can commit in the opposite order to created_at. Every
 -- linked account/previous email must retain the earliest authoritative instant,
 -- not whichever transaction happened to create its account row first.
 WITH RECURSIVE linked_accounts(user_id) AS (
  SELECT p_user
  UNION
  SELECT other.account_user_id FROM linked_accounts linked
  JOIN private.account_trial_emails own ON own.account_user_id=linked.user_id
  JOIN private.account_trial_emails other ON other.normalized_email=own.normalized_email
 ) SELECT array_agg(user_id) INTO linked_ids FROM linked_accounts;
 SELECT min(first_signup_at) INTO original FROM private.account_trial_history WHERE account_user_id=ANY(linked_ids);
 UPDATE private.account_trial_history SET first_signup_at=original
 WHERE account_user_id=ANY(linked_ids) AND first_signup_at>original;
 UPDATE private.email_trial_history e SET first_signup_at=a.first_signup_at
 FROM private.account_trial_emails linked JOIN private.account_trial_history a ON a.account_user_id=linked.account_user_id
 WHERE a.account_user_id=ANY(linked_ids) AND e.normalized_email=linked.normalized_email AND e.first_signup_at>a.first_signup_at;
 -- Initialize only the existing zero-price Starter plan, never a paid plan.
 -- A payment/owner-assigned non-Starter subscription is not replaced.
 INSERT INTO public.user_subscriptions(user_id,plan_id,started_at,expires_at,status,is_read_only)
 SELECT a.account_user_id,starter_id,a.first_signup_at,a.trial_ends_at,
   CASE WHEN now()<a.trial_ends_at THEN 'active' ELSE 'expired' END,now()>=a.trial_ends_at
 FROM private.account_trial_history a JOIN auth.users existing ON existing.id=a.account_user_id
 WHERE a.account_user_id=ANY(linked_ids)
 ON CONFLICT(user_id) DO UPDATE SET started_at=EXCLUDED.started_at,expires_at=EXCLUDED.expires_at,
   status=EXCLUDED.status,is_read_only=EXCLUDED.is_read_only,updated_at=now()
 WHERE public.user_subscriptions.plan_id=EXCLUDED.plan_id;
END $$;
REVOKE ALL ON FUNCTION private.register_account_trial(uuid,text,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.record_auth_trial_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$ BEGIN
 PERFORM private.register_account_trial(NEW.id,NEW.email,NEW.created_at);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.record_auth_trial_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER record_auth_trial_identity AFTER INSERT OR UPDATE OF email ON auth.users
 FOR EACH ROW EXECUTE FUNCTION private.record_auth_trial_identity();
-- Existing users preserve their original signup instant, not migration time.
DO $$ DECLARE account record; BEGIN
 FOR account IN SELECT id,email,created_at FROM auth.users WHERE nullif(btrim(email),'') IS NOT NULL ORDER BY created_at,id LOOP
  PERFORM private.register_account_trial(account.id,account.email,account.created_at);
 END LOOP;
END $$;

CREATE FUNCTION private.guard_immutable_trial_history() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Trial eligibility history cannot be reset' USING ERRCODE='42501'; END IF;
 IF NEW.first_signup_at>OLD.first_signup_at THEN RAISE EXCEPTION 'Trial expiry cannot be extended' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='email_trial_history' AND to_jsonb(NEW)->>'normalized_email' IS DISTINCT FROM to_jsonb(OLD)->>'normalized_email'
 OR TG_TABLE_NAME='account_trial_history' AND to_jsonb(NEW)->>'account_user_id' IS DISTINCT FROM to_jsonb(OLD)->>'account_user_id' THEN
  RAISE EXCEPTION 'Trial identity cannot be reassigned' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_immutable_trial_history() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_email_trial_history BEFORE UPDATE OR DELETE ON private.email_trial_history
 FOR EACH ROW EXECUTE FUNCTION private.guard_immutable_trial_history();
CREATE TRIGGER guard_account_trial_history BEFORE UPDATE OR DELETE ON private.account_trial_history
 FOR EACH ROW EXECUTE FUNCTION private.guard_immutable_trial_history();

CREATE FUNCTION public.get_my_trial_state() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,private,auth AS $$
DECLARE actor uuid:=auth.uid(); original private.account_trial_history;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO original FROM private.account_trial_history WHERE account_user_id=actor;
 IF original.account_user_id IS NULL THEN RAISE EXCEPTION 'Trial eligibility unavailable' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('trial_started_at',original.first_signup_at,'trial_ends_at',original.trial_ends_at,
   'server_now',now(),'trial_expired',now()>=original.trial_ends_at);
END $$;
REVOKE ALL ON FUNCTION public.get_my_trial_state() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_trial_state() TO authenticated;
-- No second seven-day extension through the old endpoint.
REVOKE EXECUTE ON FUNCTION public.extend_starter_trial_once() FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

-- Extend ordinary return eligibility only after the immutable registry exists.
-- Neither closing nor reopening creates a trial or changes its original clock.
CREATE OR REPLACE FUNCTION public.get_my_account_return_eligibility() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=auth.uid(); lifecycle public.account_lifecycle; blocked boolean; closed boolean; valid boolean;
 deadline timestamptz; entitlement_kind text:='paid';
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO lifecycle FROM public.account_lifecycle WHERE account_owner_id=actor;
 blocked:=private.admin_customer_retention_required(actor);
 closed:=coalesce(lifecycle.status='scheduled_for_deletion' AND lifecycle.ordinary_closed_at IS NOT NULL,false);
 deadline:=lifecycle.original_paid_until;
 valid:=coalesce(isfinite(deadline) AND deadline>now() AND EXISTS(
  SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=actor
  AND s.plan_id=lifecycle.original_paid_plan_id AND s.started_at=lifecycle.original_paid_started_at
  AND s.expires_at=deadline AND s.status IN ('active','cancelled')),false);
 IF lifecycle.original_paid_plan_id IS NULL AND NOT EXISTS(
  SELECT 1 FROM public.user_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id
  WHERE s.user_id=actor AND p.price_aud>0) THEN
  entitlement_kind:='trial';
  SELECT trial_ends_at INTO deadline FROM private.account_trial_history WHERE account_user_id=actor;
  valid:=coalesce(isfinite(deadline) AND deadline>now() AND EXISTS(
   SELECT 1 FROM public.user_subscriptions s JOIN private.account_trial_history h ON h.account_user_id=s.user_id
   JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.user_id=actor
   AND p.name='Starter' AND p.price_aud=0 AND p.is_active AND s.started_at=h.first_signup_at
   AND s.expires_at=h.trial_ends_at AND s.status='active' AND NOT s.is_read_only),false);
 END IF;
 RETURN jsonb_build_object('account_closed',closed,'admin_blocked',blocked,'paid_until',lifecycle.original_paid_until,
  'entitlement_kind',entitlement_kind,'entitlement_until',deadline,'server_now',now(),
  'can_reopen',closed AND NOT blocked AND valid,'renewal_required',closed AND NOT blocked AND NOT valid);
END $$;
REVOKE ALL ON FUNCTION public.get_my_account_return_eligibility() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_account_return_eligibility() TO authenticated;

CREATE FUNCTION private.customer_entitlement_state(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE actor uuid:=p_user; owner_id uuid; subscription public.user_subscriptions;
 trial private.account_trial_history; deadline timestamptz; status_value text; kind text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT account_owner_id INTO owner_id FROM public.account_members WHERE member_user_id=actor AND accepted_at IS NOT NULL
   AND access_disabled_at IS NULL ORDER BY (role='master') DESC,invited_at LIMIT 1;
 owner_id:=coalesce(owner_id,actor);
 IF private.is_platform_owner(actor) AND public.has_role(actor,'admin'::public.app_role) THEN
  RETURN jsonb_build_object('status','active','kind','platform_owner','server_now',now(),'expires_at',NULL); END IF;
 IF private.account_planning_blocked(actor) OR private.admin_deleted_planning_blocked(actor) THEN status_value:='admin_blocked';
 ELSIF private.closed_account_planning_blocked(actor) THEN status_value:='closed'; END IF;
 SELECT * INTO subscription FROM public.user_subscriptions WHERE user_id=owner_id ORDER BY updated_at DESC LIMIT 1;
 IF subscription.plan_id IN ('78cdab0d-d81d-4757-b7cc-f210b8b30f47','1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8','cd10f207-2109-4546-a635-0baa68ba8213') THEN
  kind:='paid';deadline:=subscription.expires_at;
  status_value:=coalesce(status_value,CASE WHEN NOT isfinite(deadline) THEN 'access_unavailable'
    WHEN now()>=deadline THEN 'paid_expired' WHEN subscription.status='active' AND NOT subscription.is_read_only THEN 'active' ELSE 'access_unavailable' END);
 ELSE
  SELECT * INTO trial FROM private.account_trial_history WHERE account_user_id=owner_id;
  kind:='trial';deadline:=trial.trial_ends_at;
  status_value:=coalesce(status_value,CASE WHEN deadline IS NULL THEN 'access_unavailable' WHEN now()<deadline THEN 'active' ELSE 'trial_expired' END);
 END IF;
 RETURN jsonb_build_object('status',status_value,'kind',kind,'server_now',now(),'expires_at',deadline);
END $$;
REVOKE ALL ON FUNCTION private.customer_entitlement_state(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.get_my_customer_entitlement() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,private,auth AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 RETURN private.customer_entitlement_state(auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.get_my_customer_entitlement() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_my_customer_entitlement() TO authenticated;

CREATE FUNCTION private.customer_entitlement_blocked(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$
 SELECT private.customer_entitlement_state(p_user)->>'status' IS DISTINCT FROM 'active';
$$;
REVOKE ALL ON FUNCTION private.customer_entitlement_blocked(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.customer_entitlement_blocked(uuid) TO authenticated,service_role;
CREATE FUNCTION public.is_customer_entitlement_blocked(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,private,auth AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 RETURN private.customer_entitlement_blocked(p_user_id);
END $$;
REVOKE ALL ON FUNCTION public.is_customer_entitlement_blocked(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer_entitlement_blocked(uuid) TO service_role;

DO $$ DECLARE relation regclass; BEGIN
 FOR relation IN SELECT DISTINCT p.polrelid::regclass FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','storage')
 AND p.polname IN ('Suspension blocks planning access','Suspension blocks table planning','Suspension blocks storage access') LOOP
  EXECUTE format('CREATE POLICY "Current entitlement required for planning" ON %s AS RESTRICTIVE FOR ALL TO authenticated USING (NOT private.customer_entitlement_blocked((SELECT auth.uid()))) WITH CHECK (NOT private.customer_entitlement_blocked((SELECT auth.uid())))',relation);
 END LOOP;
END $$;
-- Wrap rather than weaken the existing administrator/closed-account hook.
ALTER FUNCTION public.guard_suspended_data_request() RENAME TO guard_account_request_before_entitlement;
ALTER FUNCTION public.guard_account_request_before_entitlement() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.guard_account_request_before_entitlement() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_suspended_data_request() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$ BEGIN
 PERFORM private.guard_account_request_before_entitlement();
 IF auth.role()='authenticated' AND private.customer_entitlement_blocked(auth.uid())
 AND coalesce(current_setting('request.path',true),'') NOT IN (
  '/rpc/get_my_customer_entitlement','/rpc/get_my_account_access','/rpc/get_my_account_lifecycle',
  '/rpc/get_my_account_return_eligibility','/rpc/get_my_trial_state','/rpc/reactivate_my_account','/rpc/deactivate_my_account',
  '/rpc/reply_to_account_suspension','/rpc/is_account_operational') THEN
  RAISE EXCEPTION 'Your original entitlement has ended or account access is restricted.' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.guard_suspended_data_request() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO authenticator;
COMMIT;
