BEGIN;
-- Data-preserving rollback. Retain every launch registration and contact detail;
-- stop accepting more interest without sending anything or enrolling anyone.
UPDATE private.prelaunch_control SET enabled=false,changed_at=now() WHERE singleton;
DROP TRIGGER IF EXISTS prelaunch_blocks_new_auth ON auth.users;
DO $$ DECLARE relation regclass; BEGIN
 FOR relation IN SELECT polrelid::regclass FROM pg_policy WHERE polname='Prelaunch verified owner access' LOOP
  EXECUTE format('DROP POLICY "Prelaunch verified owner access" ON %s',relation);
 END LOOP;
END $$;
DROP FUNCTION public.guard_suspended_data_request();
ALTER FUNCTION private.guard_data_request_before_prelaunch() SET SCHEMA public;
ALTER FUNCTION public.guard_data_request_before_prelaunch() RENAME TO guard_suspended_data_request;
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO authenticator,authenticated;
DROP FUNCTION private.customer_entitlement_state(uuid);
ALTER FUNCTION private.customer_entitlement_before_prelaunch(uuid) RENAME TO customer_entitlement_state;
NOTIFY pgrst,'reload schema';
COMMIT;
