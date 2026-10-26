-- QA ONLY. Rollback-only database integration tests, not email/browser E2E.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at,raw_user_meta_data) VALUES
('de6d0127-0001-4000-8000-000000000001','qa-active-20261027@example.invalid',now(),now(),'{"pending_promo_code":"QA_UNVERIFIED_CODE","intended_plan":"unlimited"}'),
('de6d0127-0001-4000-8000-000000000002','qa-expired-20261027@example.invalid',now()-interval '8 days',now(),'{}'),
('de6d0127-0001-4000-8000-000000000003','qa-other-20261027@example.invalid',now(),now(),'{}');
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id='de6d0127-0001-4000-8000-000000000001' AND plan_id='fe3c6c39-01eb-47c8-b8c1-5a0efb48562d' AND expires_at-started_at=interval '7 days' AND status='active' AND NOT is_read_only) THEN RAISE EXCEPTION 'New signup did not initialize seven-day Starter'; END IF;
 IF private.customer_entitlement_state('de6d0127-0001-4000-8000-000000000002')->>'status'<>'trial_expired' THEN RAISE EXCEPTION 'Expired trial granted access'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id::text LIKE 'de6d0127-%') THEN RAISE EXCEPTION 'Fixture gained elevated role'; END IF;
END $$;
-- Returning sign-in/email update cannot restart an expired trial.
UPDATE auth.users SET last_sign_in_at=now(),email='QA-EXPIRED-20261027@example.invalid' WHERE id='de6d0127-0001-4000-8000-000000000002';
DO $$ BEGIN
 IF private.customer_entitlement_state('de6d0127-0001-4000-8000-000000000002')->>'status'<>'trial_expired' THEN RAISE EXCEPTION 'Return reset expired trial'; END IF;
 BEGIN
  UPDATE private.account_trial_history SET first_signup_at=now() WHERE account_user_id='de6d0127-0001-4000-8000-000000000002';
  RAISE EXCEPTION 'Trial history extension succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','de6d0127-0001-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.profiles(id,first_name,email) VALUES('de6d0127-0001-4000-8000-000000000001','QA','qa-active-20261027@example.invalid');
INSERT INTO public.onboarding_drafts(id,user_id,mode,answers,current_step) VALUES('de6d0127-0003-4000-8000-000000000001','de6d0127-0001-4000-8000-000000000001','first_event','{}',1);
UPDATE public.onboarding_drafts SET answers='{"partner1Name":"QA","partner2Name":"Test"}',current_step=2 WHERE id='de6d0127-0003-4000-8000-000000000001';
INSERT INTO public.events(id,user_id,name,guest_limit,onboarding_draft_id) VALUES('de6d0127-0002-4000-8000-000000000001','de6d0127-0001-4000-8000-000000000001','QA rollback trial event',20,'de6d0127-0003-4000-8000-000000000001');
INSERT INTO public.guests(event_id,user_id,first_name) SELECT 'de6d0127-0002-4000-8000-000000000001','de6d0127-0001-4000-8000-000000000001','QA Guest '||n FROM generate_series(1,20) n;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.guests WHERE event_id='de6d0127-0002-4000-8000-000000000001')<>20 THEN RAISE EXCEPTION '20 guests unavailable'; END IF;
 BEGIN
  INSERT INTO public.guests(event_id,user_id,first_name) VALUES('de6d0127-0002-4000-8000-000000000001','de6d0127-0001-4000-8000-000000000001','Guest 21');
  RAISE EXCEPTION 'Guest 21 accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF public.get_my_trial_state()->>'trial_expired'<>'false' THEN RAISE EXCEPTION 'Active trial RPC incorrect'; END IF;
 IF public.get_my_customer_entitlement()->>'status'<>'active' THEN RAISE EXCEPTION 'Active entitlement RPC incorrect'; END IF;
 BEGIN
  UPDATE public.user_subscriptions SET plan_id='cd10f207-2109-4546-a635-0baa68ba8213' WHERE user_id='de6d0127-0001-4000-8000-000000000001';
  RAISE EXCEPTION 'Customer self-upgraded';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
-- A second active customer cannot see or edit the first customer's data.
SELECT set_config('request.jwt.claim.sub','de6d0127-0001-4000-8000-000000000003',true);
DO $$ DECLARE affected integer; BEGIN
 IF EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0002-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.guests WHERE event_id='de6d0127-0002-4000-8000-000000000001') OR EXISTS(SELECT 1 FROM public.onboarding_drafts WHERE id='de6d0127-0003-4000-8000-000000000001') THEN RAISE EXCEPTION 'Cross-account read allowed'; END IF;
 UPDATE public.events SET name='Unexpected edit' WHERE id='de6d0127-0002-4000-8000-000000000001'; GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Cross-account event edit allowed'; END IF;
END $$;
-- Expired customer still can obtain its own authoritative expiry decision,
-- but cannot create planning data.
SELECT set_config('request.jwt.claim.sub','de6d0127-0001-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.get_my_trial_state()->>'trial_expired'<>'true' OR public.get_my_customer_entitlement()->>'status'<>'trial_expired' THEN RAISE EXCEPTION 'Expired RPC incorrect'; END IF;
 BEGIN
  INSERT INTO public.events(user_id,name) VALUES('de6d0127-0001-4000-8000-000000000002','Expired attempt');
  RAISE EXCEPTION 'Expired account created event';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT 'PASS: seven-day initialization; promo metadata gives no paid access; expired trial; no reset on return; immutable history; profile/draft/event persistence; 20 guests; guest 21 rejected; trial/entitlement RPCs; no self-upgrade; account isolation; expired event creation rejected. All fixtures rolled back.' AS result;
ROLLBACK;
