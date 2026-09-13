-- LOCAL/PREPARED ONLY: timestamp-only authenticated activity, no browsing data.
BEGIN;
CREATE TABLE public.customer_account_activity(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 last_active_at timestamptz,
 last_sign_in_at timestamptz,
 account_updated_at timestamptz
);
ALTER TABLE public.customer_account_activity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_account_activity FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customer_account_activity TO authenticated;
CREATE POLICY "Customers read own activity" ON public.customer_account_activity FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "Canonical owner reads customer activity" ON public.customer_account_activity FOR SELECT TO authenticated
 USING((SELECT private.is_platform_owner(auth.uid())) AND (SELECT public.has_role(auth.uid(),'admin'::public.app_role)));

CREATE FUNCTION public.record_authenticated_customer_activity() RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE caller uuid:=auth.uid(); recorded timestamptz; BEGIN
 IF caller IS NULL OR NOT public.is_account_operational(caller) THEN RAISE EXCEPTION 'Operational authenticated account required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.customer_account_activity(user_id,last_active_at) VALUES(caller,clock_timestamp())
 ON CONFLICT(user_id) DO UPDATE SET last_active_at=excluded.last_active_at
 WHERE customer_account_activity.last_active_at IS NULL OR customer_account_activity.last_active_at<=excluded.last_active_at-interval '1 second'
 RETURNING last_active_at INTO recorded;
 IF recorded IS NULL THEN SELECT last_active_at INTO recorded FROM public.customer_account_activity WHERE user_id=caller; END IF;
 RETURN recorded;
END $$;
REVOKE ALL ON FUNCTION public.record_authenticated_customer_activity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_authenticated_customer_activity() TO authenticated;

CREATE FUNCTION private.record_customer_sign_in() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF NEW.last_sign_in_at IS NOT NULL AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
  INSERT INTO public.customer_account_activity(user_id,last_sign_in_at) VALUES(NEW.id,NEW.last_sign_in_at)
  ON CONFLICT(user_id) DO UPDATE SET last_sign_in_at=excluded.last_sign_in_at;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.record_customer_sign_in() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_customer_sign_in AFTER UPDATE OF last_sign_in_at ON auth.users FOR EACH ROW EXECUTE FUNCTION private.record_customer_sign_in();

-- A timestamp-only invalidation signal, never copied profile contents.
CREATE FUNCTION private.record_customer_profile_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 INSERT INTO public.customer_account_activity(user_id,account_updated_at) VALUES(NEW.id,clock_timestamp())
 ON CONFLICT(user_id) DO UPDATE SET account_updated_at=excluded.account_updated_at;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.record_customer_profile_update() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_customer_profile_update AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.record_customer_profile_update();

CREATE FUNCTION public.admin_get_customer_activity() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$ BEGIN
 IF NOT private.is_platform_owner(auth.uid()) OR NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]') FROM public.customer_account_activity a);
END $$;
REVOKE ALL ON FUNCTION public.admin_get_customer_activity() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_get_customer_activity() TO authenticated;

ALTER FUNCTION public.get_admin_platform_snapshot() RENAME TO get_admin_platform_snapshot_access_controls;
ALTER FUNCTION public.get_admin_platform_snapshot_access_controls() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_admin_platform_snapshot_access_controls() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_admin_platform_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $$ DECLARE snapshot jsonb; customers jsonb; BEGIN
 IF NOT private.is_platform_owner(auth.uid()) OR NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 snapshot:=private.get_admin_platform_snapshot_access_controls();
 SELECT coalesce(jsonb_agg(entry||jsonb_build_object('country_code',p.country_code,'mobile',p.mobile,'account_id',p.account_id,
   'last_active_at',a.last_active_at,'last_sign_in_at',u.last_sign_in_at)),'[]') INTO customers
 FROM jsonb_array_elements(snapshot->'customers') entry LEFT JOIN public.profiles p ON p.id::text=entry->>'id'
 LEFT JOIN auth.users u ON u.id=p.id LEFT JOIN public.customer_account_activity a ON a.user_id=p.id;
 RETURN jsonb_set(snapshot,'{customers}',customers)||jsonb_build_object('customer_activity_ready',true);
END $$;
REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  RAISE EXCEPTION 'Required supabase_realtime publication is missing';
 END IF;
 ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_account_activity;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
