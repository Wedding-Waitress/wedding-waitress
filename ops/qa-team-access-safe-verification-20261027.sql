-- QA ONLY; accepted-membership fixtures, not invitation email/acceptance E2E.
BEGIN;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM public.events) THEN RAISE EXCEPTION 'Empty QA required'; END IF; END $$;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES
('de6d0127-0091-4000-8000-000000000001','qa-team-owner@example.invalid',now(),now()),
('de6d0127-0091-4000-8000-000000000002','qa-team-member@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name,email) VALUES('de6d0127-0091-4000-8000-000000000001','Owner','qa-team-owner@example.invalid');
INSERT INTO public.events(id,user_id,name) VALUES('de6d0127-0092-4000-8000-000000000001','de6d0127-0091-4000-8000-000000000001','Team fixture');
INSERT INTO public.account_members(account_owner_id,member_user_id,role,accepted_at) VALUES('de6d0127-0091-4000-8000-000000000001','de6d0127-0091-4000-8000-000000000002','standard',NULL);
SELECT set_config('request.jwt.claim.sub','de6d0127-0091-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0092-4000-8000-000000000001') THEN RAISE EXCEPTION 'Unaccepted member read organiser event'; END IF;
END $$;
RESET ROLE;
UPDATE public.account_members SET accepted_at=now() WHERE account_owner_id='de6d0127-0091-4000-8000-000000000001' AND member_user_id='de6d0127-0091-4000-8000-000000000002';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.current_planning_account_owner() IS DISTINCT FROM 'de6d0127-0091-4000-8000-000000000001'::uuid THEN RAISE EXCEPTION 'Accepted team owner not resolved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0092-4000-8000-000000000001') THEN RAISE EXCEPTION 'Accepted member cannot read event'; END IF;
 IF public.is_account_master('de6d0127-0091-4000-8000-000000000002') THEN RAISE EXCEPTION 'Standard member became master'; END IF;
END $$;
UPDATE public.events SET name='Allowed team edit' WHERE id='de6d0127-0092-4000-8000-000000000001';
INSERT INTO public.guests(event_id,user_id,first_name,last_name) VALUES('de6d0127-0092-4000-8000-000000000001','de6d0127-0091-4000-8000-000000000002','Team-added','Guest');
DO $$ DECLARE rejected boolean:=false; affected integer; BEGIN
 BEGIN INSERT INTO public.events(user_id,name) VALUES('de6d0127-0091-4000-8000-000000000002','Unauthorized member event');
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'WW_EVENT_MASTER_REQUIRED' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Standard member created event'; END IF;
 IF public.is_account_master('de6d0127-0091-4000-8000-000000000002') THEN RAISE EXCEPTION 'Standard member satisfies master-only deletion predicate'; END IF;
 IF has_table_privilege('authenticated','public.account_members','UPDATE') THEN RAISE EXCEPTION 'Customer has direct membership update privilege'; END IF;
 BEGIN PERFORM public.admin_get_customer_account_preview('de6d0127-0091-4000-8000-000000000001');
 RAISE EXCEPTION 'Team member read administrator preview'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0092-4000-8000-000000000001' AND user_id='de6d0127-0091-4000-8000-000000000001' AND name='Allowed team edit') THEN RAISE EXCEPTION 'Allowed team edit not saved or owner changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.guests WHERE event_id='de6d0127-0092-4000-8000-000000000001' AND user_id='de6d0127-0091-4000-8000-000000000001' AND first_name='Team-added') THEN RAISE EXCEPTION 'Team guest owner not canonicalized'; END IF;
END $$;
UPDATE public.account_members SET access_disabled_at=now() WHERE account_owner_id='de6d0127-0091-4000-8000-000000000001' AND member_user_id='de6d0127-0091-4000-8000-000000000002';
-- Same request identity: revocation must take effect without changing claims.
SET LOCAL ROLE authenticated;
DO $$ DECLARE affected integer; BEGIN
 IF public.current_planning_account_owner() IS NOT NULL OR EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0092-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.guests WHERE event_id='de6d0127-0092-4000-8000-000000000001') THEN RAISE EXCEPTION 'Revoked member retained access'; END IF;
 UPDATE public.events SET name='Revoked edit' WHERE id='de6d0127-0092-4000-8000-000000000001'; GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Revoked member edited event'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: pending member denied; accepted standard member reads/edits existing event and adds correctly-owned guest; member event creation denied; no master deletion predicate or direct membership-update privilege; administrator preview denied; revocation immediately blocks same-identity reads/edits. Fixtures rolled back.' AS result;
ROLLBACK;