BEGIN;
-- Private, database-operator-controlled launch switch. This does not assign
-- roles, rewrite subscriptions, delete identities or release closed accounts.
CREATE TABLE private.prelaunch_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT true,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.prelaunch_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.prelaunch_control FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE owners uuid[]; BEGIN
 -- No-data branches cannot seed a verified owner. Leave the switch unseeded
 -- and preserve every fail-closed access check until QA is configured.
 IF NOT EXISTS (SELECT 1 FROM auth.users) THEN RETURN; END IF;
 SELECT array_agg(u.id) INTO owners FROM auth.users u
 WHERE private.is_platform_owner(u.id) AND public.has_role(u.id,'admin'::public.app_role);
 IF cardinality(owners) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Exactly one established platform owner is required'; END IF;
 INSERT INTO private.prelaunch_control(owner_user_id) VALUES(owners[1]);
END $$;
CREATE FUNCTION private.prelaunch_access_allowed(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT NOT c.enabled OR (p_user=c.owner_user_id AND private.is_platform_owner(p_user)
 AND public.has_role(p_user,'admin'::public.app_role)) FROM private.prelaunch_control c WHERE singleton;
$$;
REVOKE ALL ON FUNCTION private.prelaunch_access_allowed(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.prelaunch_access_allowed(uuid) TO authenticated,service_role;
CREATE FUNCTION public.get_prelaunch_access() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('enabled',c.enabled,'allowed',coalesce(private.prelaunch_access_allowed(auth.uid()),false))
 FROM private.prelaunch_control c WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.get_prelaunch_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prelaunch_access() TO anon,authenticated;
CREATE FUNCTION public.is_prelaunch_access_blocked(p_user_id uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 RETURN NOT coalesce(private.prelaunch_access_allowed(p_user_id),false);
END $$;
REVOKE ALL ON FUNCTION public.is_prelaunch_access_blocked(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_prelaunch_access_blocked(uuid) TO service_role;
-- New Auth registrations are refused before any existing AFTER INSERT trial,
-- profile or account-membership trigger can run. Existing login is untouched.
CREATE FUNCTION private.guard_prelaunch_auth_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF coalesce((SELECT enabled FROM private.prelaunch_control WHERE singleton),true) THEN
  RAISE EXCEPTION 'Wedding Waitress is in pre-launch. Register your interest on the website.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_prelaunch_auth_insert() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prelaunch_blocks_new_auth BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.guard_prelaunch_auth_insert();
-- RLS applies independently of PostgREST, including existing sessions and
-- storage operations. Add restrictive policies; keep ownership policies intact.
DO $$ DECLARE relation regclass; BEGIN
 FOR relation IN SELECT c.oid::regclass FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind='r' AND c.relrowsecurity AND (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects')) LOOP
  EXECUTE format('CREATE POLICY "Prelaunch verified owner access" ON %s AS RESTRICTIVE FOR ALL TO authenticated USING (coalesce(private.prelaunch_access_allowed((SELECT auth.uid())),false)) WITH CHECK (coalesce(private.prelaunch_access_allowed((SELECT auth.uid())),false))',relation);
 END LOOP;
END $$;
ALTER FUNCTION public.guard_suspended_data_request() RENAME TO guard_data_request_before_prelaunch;
ALTER FUNCTION public.guard_data_request_before_prelaunch() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.guard_data_request_before_prelaunch() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_suspended_data_request() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF auth.role()='authenticated' AND NOT coalesce(private.prelaunch_access_allowed(auth.uid()),false) THEN
  IF coalesce(current_setting('request.path',true),'') IN ('/rpc/get_prelaunch_access','/rpc/get_my_account_lifecycle','/rpc/get_my_account_access') THEN RETURN; END IF;
  RAISE EXCEPTION 'Wedding Waitress pre-launch access is restricted to its verified owner.' USING ERRCODE='42501';
 END IF;
 PERFORM private.guard_data_request_before_prelaunch();
END $$;
REVOKE ALL ON FUNCTION public.guard_suspended_data_request() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO authenticator,authenticated;
-- Service handlers using the existing entitlement decision also see the hold.
ALTER FUNCTION private.customer_entitlement_state(uuid) RENAME TO customer_entitlement_before_prelaunch;
CREATE FUNCTION private.customer_entitlement_state(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF NOT coalesce(private.prelaunch_access_allowed(p_user),false) THEN
  RETURN jsonb_build_object('status','admin_blocked','kind','trial','server_now',now(),'expires_at',NULL);
 END IF;
 RETURN private.customer_entitlement_before_prelaunch(p_user);
END $$;
REVOKE ALL ON FUNCTION private.customer_entitlement_state(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.prelaunch_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 first_name text NOT NULL CHECK(length(first_name) BETWEEN 1 AND 100),
 last_name text NOT NULL CHECK(length(last_name) BETWEEN 1 AND 100),
 email text NOT NULL UNIQUE CHECK(email=lower(btrim(email)) AND length(email)<=254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 mobile text NOT NULL CHECK(mobile ~ '^\+?[0-9]{8,15}$'),
 pending_promo_code text NOT NULL DEFAULT '' CHECK(length(pending_promo_code)<=64),
 intended_plan text CHECK(intended_plan IN ('essential','premium','unlimited')),
 registered_at timestamptz NOT NULL DEFAULT now(),
 privacy_acknowledged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.prelaunch_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.prelaunch_registrations FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE private.prelaunch_registrations IS 'Unverified launch interest only, not Auth accounts or redeemed promotions. No automatic notification or enrollment.';
CREATE TABLE private.prelaunch_request_limits (source_hash text NOT NULL, minute timestamptz NOT NULL, attempts integer NOT NULL, PRIMARY KEY(source_hash,minute));
ALTER TABLE private.prelaunch_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.prelaunch_request_limits FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.save_prelaunch_registration(p_details jsonb,p_source_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE counter integer; time_bucket timestamptz:=date_trunc('minute',clock_timestamp());
 first_value text:=btrim(p_details->>'first_name'); last_value text:=btrim(p_details->>'last_name');
 email_value text:=lower(btrim(p_details->>'email')); mobile_value text:=p_details->>'mobile';
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
 IF NOT coalesce((SELECT enabled FROM private.prelaunch_control WHERE singleton),false) THEN RAISE EXCEPTION 'Launch interest registration is closed'; END IF;
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR p_source_hash IS NULL OR p_source_hash !~ '^[0-9a-f]{64}$'
 OR jsonb_typeof(p_details->'first_name') IS DISTINCT FROM 'string' OR jsonb_typeof(p_details->'last_name') IS DISTINCT FROM 'string'
 OR jsonb_typeof(p_details->'email') IS DISTINCT FROM 'string' OR jsonb_typeof(p_details->'mobile') IS DISTINCT FROM 'string'
 OR first_value IS NULL OR last_value IS NULL OR email_value IS NULL OR mobile_value IS NULL
 OR length(coalesce(p_details->>'promo_code',''))>64 THEN RAISE EXCEPTION 'Invalid registration'; END IF;
 -- Bound retention for abuse counters; registrations themselves are retained.
 DELETE FROM private.prelaunch_request_limits WHERE minute<time_bucket-interval '1 day';
 INSERT INTO private.prelaunch_request_limits VALUES('global',time_bucket,1)
 ON CONFLICT(source_hash,minute) DO UPDATE SET attempts=private.prelaunch_request_limits.attempts+1 RETURNING attempts INTO counter;
 IF counter>300 THEN RAISE EXCEPTION 'Please try again later'; END IF;
 INSERT INTO private.prelaunch_request_limits VALUES(p_source_hash,time_bucket,1)
 ON CONFLICT(source_hash,minute) DO UPDATE SET attempts=private.prelaunch_request_limits.attempts+1 RETURNING attempts INTO counter;
 IF counter>10 THEN RAISE EXCEPTION 'Please try again later'; END IF;
 INSERT INTO private.prelaunch_registrations(first_name,last_name,email,mobile,pending_promo_code,intended_plan)
 VALUES(first_value,last_value,email_value,mobile_value,coalesce(p_details->>'promo_code',''),nullif(p_details->>'intended_plan',''))
 ON CONFLICT(email) DO NOTHING;
 -- A duplicate never overwrites another person's details or reveals membership.
 RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.save_prelaunch_registration(jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_prelaunch_registration(jsonb,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
