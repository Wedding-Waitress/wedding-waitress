-- QA ONLY; no emails sent. Rollback-only immutable trial-registry tests.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0051-4000-8000-000000000001','qa-original-email@example.invalid',now()-interval '8 days',now());
-- An account changing its email must not obtain another seven days.
UPDATE auth.users SET email='qa-changed-email@example.invalid' WHERE id='de6d0127-0051-4000-8000-000000000001';
-- A new account reusing the now-vacant original email must inherit the
-- original eligibility window, including normalized email case.
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0051-4000-8000-000000000002','QA-ORIGINAL-EMAIL@example.invalid',now(),now());
DO $$ BEGIN
 IF private.customer_entitlement_state('de6d0127-0051-4000-8000-000000000001')->>'status'<>'trial_expired' THEN RAISE EXCEPTION 'Email change restarted trial'; END IF;
 IF private.customer_entitlement_state('de6d0127-0051-4000-8000-000000000002')->>'status'<>'trial_expired' THEN RAISE EXCEPTION 'Reused email restarted trial'; END IF;
 IF EXISTS(SELECT 1 FROM private.account_trial_history WHERE account_user_id IN ('de6d0127-0051-4000-8000-000000000001','de6d0127-0051-4000-8000-000000000002') AND first_signup_at<>now()-interval '8 days') THEN RAISE EXCEPTION 'Original signup history changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id IN ('de6d0127-0051-4000-8000-000000000001','de6d0127-0051-4000-8000-000000000002') AND (expires_at>now() OR NOT is_read_only)) THEN RAISE EXCEPTION 'Reused identity received active Starter'; END IF;
END $$;
SELECT 'PASS: changing email, reusing the original email on a new account, and changing email case do not restart the original expired seven-day trial. Fixtures rolled back.' AS result;
ROLLBACK;
