$ErrorActionPreference = 'Stop'
$holdRoot = Split-Path -Parent $PSScriptRoot
$holdPsql = Join-Path $holdRoot 'work/postgresql-17.11-portable/pgsql/bin/psql.exe'
function Read-HoldDefinitions([string]$Path) {
  (Get-Content -Raw (Join-Path $holdRoot $Path)) -replace '(?m)^BEGIN;\r?\n','' -replace '(?m)^COMMIT;\s*$',''
}
$holdGuard = @'
DO $$ BEGIN IF current_database()<>'account_entitlement_validation_20260912_1810' OR inet_server_addr()<>'127.0.0.1'::inet THEN RAISE EXCEPTION 'Local database guard failed'; END IF; END $$;
BEGIN;
-- Match current Auth columns in this older synthetic schema only.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb;
'@
$holdFixture = @'
INSERT INTO auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data)
VALUES('13131313-1313-4313-8313-131313131313','existing-prelaunch@example.test',now(),now(),'{"admin":true,"owner":true}');
CREATE TABLE public.prelaunch_rls_fixture (value integer);
ALTER TABLE public.prelaunch_rls_fixture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fixture access" ON public.prelaunch_rls_fixture FOR ALL TO authenticated USING(true) WITH CHECK(true);
GRANT SELECT ON public.prelaunch_rls_fixture TO authenticated;
INSERT INTO public.prelaunch_rls_fixture VALUES(1);
'@
$holdAssertions = @'
DO $$ DECLARE owner_id uuid; details jsonb; result jsonb; before_users integer; before_trials integer; BEGIN
 SELECT owner_user_id INTO owner_id FROM private.prelaunch_control;
 IF private.prelaunch_access_allowed(owner_id) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Owner locked out'; END IF;
 IF private.prelaunch_access_allowed('13131313-1313-4313-8313-131313131313') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Existing nonowner allowed'; END IF;
 IF private.prelaunch_access_allowed(NULL) IS DISTINCT FROM false THEN RAISE EXCEPTION 'Anonymous access allowed'; END IF;
 IF private.customer_entitlement_state(owner_id)->>'status'<>'active' THEN RAISE EXCEPTION 'Owner entitlement changed'; END IF;
 IF private.customer_entitlement_state('13131313-1313-4313-8313-131313131313')->>'status'<>'admin_blocked' THEN RAISE EXCEPTION 'Nonowner entitlement bypass'; END IF;
 SELECT count(*) INTO before_users FROM auth.users;
 SELECT count(*) INTO before_trials FROM private.account_trial_history;
 BEGIN INSERT INTO auth.users(id,email,created_at) VALUES('14141414-1414-4414-8414-141414141414','new-prelaunch@example.test',now()); RAISE EXCEPTION 'Auth signup bypass accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 details:='{"first_name":"Alex","last_name":"Taylor","email":"hold@example.test","mobile":"0412345678","promo_code":"VENUE50","intended_plan":"premium"}';
 result:=public.save_prelaunch_registration(details,repeat('a',64));
 IF result->>'saved'<>'true' THEN RAISE EXCEPTION 'Registration not saved'; END IF;
 PERFORM public.save_prelaunch_registration(details||'{"first_name":"Impersonator"}',repeat('a',64));
 IF (SELECT count(*) FROM private.prelaunch_registrations)<>1 OR (SELECT first_name FROM private.prelaunch_registrations)<>'Alex' THEN RAISE EXCEPTION 'Duplicate changed existing registration'; END IF;
 IF (SELECT count(*) FROM auth.users)<>before_users OR (SELECT count(*) FROM private.account_trial_history)<>before_trials THEN RAISE EXCEPTION 'Registration created Auth/trial'; END IF;
 IF has_function_privilege('anon','public.save_prelaunch_registration(jsonb,text)','EXECUTE') OR has_function_privilege('authenticated','public.save_prelaunch_registration(jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'Public persistence grant'; END IF;
 IF has_table_privilege('anon','private.prelaunch_registrations','SELECT') OR has_table_privilege('authenticated','private.prelaunch_control','UPDATE') THEN RAISE EXCEPTION 'Private data or switch exposed'; END IF;
 FOR i IN 1..8 LOOP PERFORM public.save_prelaunch_registration(details,repeat('a',64)); END LOOP;
 BEGIN PERFORM public.save_prelaunch_registration(details,repeat('a',64)); RAISE EXCEPTION 'Throttle bypass accepted'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Throttle bypass accepted' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('request.jwt.claim.sub','13131313-1313-4313-8313-131313131313',true);
 PERFORM set_config('request.path','/rpc/get_prelaunch_access',true);
 PERFORM public.guard_suspended_data_request();
 IF public.get_prelaunch_access()->>'allowed'<>'false' THEN RAISE EXCEPTION 'Spoofed owner metadata allowed'; END IF;
 PERFORM set_config('request.path','/events',true);
 BEGIN PERFORM public.guard_suspended_data_request(); RAISE EXCEPTION 'Data request bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 UPDATE private.prelaunch_control SET enabled=false;
 IF private.prelaunch_access_allowed('13131313-1313-4313-8313-131313131313') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Launch switch failed'; END IF;
 BEGIN PERFORM public.save_prelaunch_registration(details,repeat('b',64)); RAISE EXCEPTION 'Released waitlist still accepts'; EXCEPTION WHEN OTHERS THEN IF SQLERRM='Released waitlist still accepts' THEN RAISE; END IF; END;
END $$;
'@
$holdRoleAssertions = @'
-- Execute actual restricted roles, not superuser, to verify RLS independently
-- of the PostgREST pre-request guard.
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','13131313-1313-4313-8313-131313131313',true);
UPDATE private.prelaunch_control SET enabled=true;
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF (SELECT count(*) FROM public.prelaunch_rls_fixture)<>0 THEN RAISE EXCEPTION 'Nonowner RLS read bypass'; END IF; END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT owner_user_id::text FROM private.prelaunch_control),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF (SELECT count(*) FROM public.prelaunch_rls_fixture)<>1 THEN RAISE EXCEPTION 'Owner RLS access denied'; END IF; END $$;
RESET ROLE;
'@
$holdRollbackAssertions = @'
DO $$ BEGIN IF (SELECT count(*) FROM private.prelaunch_registrations)<>1 THEN RAISE EXCEPTION 'Rollback erased registration'; END IF; END $$;
ROLLBACK;
'@
($holdGuard +
 $holdFixture +
 (Read-HoldDefinitions 'supabase/migrations/20260913081113_prelaunch_registration_owner_access_hold.sql') +
 $holdAssertions +
 $holdRoleAssertions +
 (Read-HoldDefinitions 'supabase/rollbacks/20260913081113_prelaunch_registration_owner_access_hold.rollback.sql') +
 $holdRollbackAssertions) | & $holdPsql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d account_entitlement_validation_20260912_1810
if ($LASTEXITCODE -ne 0) { throw 'Local prelaunch validation failed. Connection close rolls back fixtures.' }
