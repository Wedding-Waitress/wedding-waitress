-- QA ONLY. Synthetic credit ledger; no messages, payments or external calls.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0031-4000-8000-000000000001','qa-credit-owner@example.invalid',now(),now());
INSERT INTO public.communication_credits(user_id,channel,credits_purchased,credits_remaining) VALUES('de6d0127-0031-4000-8000-000000000001','email',10,10);
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.deduct_communication_credit('de6d0127-0031-4000-8000-000000000001',NULL,NULL,'email',1,'qa-no-send'); RAISE EXCEPTION 'Anonymous deduction allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.check_communication_credits('de6d0127-0031-4000-8000-000000000001','email',1); RAISE EXCEPTION 'Anonymous credit check allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','de6d0127-0031-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE fn text; BEGIN
 BEGIN PERFORM public.deduct_communication_credit('de6d0127-0031-4000-8000-000000000001',NULL,NULL,'email',1,'qa-no-send'); RAISE EXCEPTION 'Customer deduction allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.check_communication_credits('de6d0127-0031-4000-8000-000000000001','email',1); RAISE EXCEPTION 'Customer legacy credit check allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 FOREACH fn IN ARRAY ARRAY['get_admin_centre_snapshot','get_admin_platform_snapshot','get_admin_promotion_payments','get_account_closure_admin_summary','admin_get_customer_activity','admin_require_verified_session'] LOOP
  BEGIN EXECUTE format('SELECT public.%I()',fn); RAISE EXCEPTION 'Customer reached administrator function %',fn; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
 FOREACH fn IN ARRAY ARRAY['admin_get_account_access_detail','admin_get_customer_account_preview','admin_get_customer_team_roster'] LOOP
  BEGIN EXECUTE format('SELECT public.%I($1)',fn) USING 'de6d0127-0031-4000-8000-000000000001'::uuid; RAISE EXCEPTION 'Customer reached administrator function %',fn; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT credits_remaining FROM public.communication_credits WHERE user_id='de6d0127-0031-4000-8000-000000000001')<>10 THEN RAISE EXCEPTION 'Untrusted caller changed balance'; END IF; END $$;
SELECT set_config('request.jwt.claim.role','service_role',true);
SET LOCAL ROLE service_role;
SELECT public.check_communication_credits('de6d0127-0031-4000-8000-000000000001','email',1) IS NOT NULL AS backend_check_works;
SELECT public.deduct_communication_credit('de6d0127-0031-4000-8000-000000000001',NULL,NULL,'email',1,'qa-no-send') AS backend_deduction_works;
RESET ROLE;
DO $$ BEGIN IF (SELECT credits_remaining FROM public.communication_credits WHERE user_id='de6d0127-0031-4000-8000-000000000001')<>9 THEN RAISE EXCEPTION 'Trusted backend deduction failed'; END IF; END $$;
SELECT 'PASS: anonymous/customer legacy credit calls rejected; ordinary customer denied nine administrator endpoints; backend credit check/deduction preserved; no external sends. Fixtures rolled back.' AS result;
ROLLBACK;
