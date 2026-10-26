-- QA ONLY; rollback-only onboarding draft ownership and idempotency.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES
('de6d0127-0101-4000-8000-000000000001','qa-draft-owner@example.invalid',now(),now()),
('de6d0127-0101-4000-8000-000000000002','qa-draft-other@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name,email) VALUES('de6d0127-0101-4000-8000-000000000001','Owner','qa-draft-owner@example.invalid');
SELECT set_config('request.jwt.claim.sub','de6d0127-0101-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.onboarding_drafts(id,user_id,mode,current_step,answers) VALUES('de6d0127-0102-4000-8000-000000000001','de6d0127-0101-4000-8000-000000000001','first_event',2,'{"partner1Name":"QA","partner2Name":"Test"}');
UPDATE public.onboarding_drafts SET current_step=5,answers=answers||'{"guestCount":"20","eventTimezone":"Australia/Melbourne"}'::jsonb WHERE id='de6d0127-0102-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.onboarding_drafts WHERE id='de6d0127-0102-4000-8000-000000000001' AND current_step=5 AND answers->>'partner1Name'='QA' AND answers->>'guestCount'='20') THEN RAISE EXCEPTION 'Saved draft update lost answers or progress'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','de6d0127-0101-4000-8000-000000000002',true);
DO $$ DECLARE affected integer; BEGIN
 IF EXISTS(SELECT 1 FROM public.onboarding_drafts WHERE id='de6d0127-0102-4000-8000-000000000001') THEN RAISE EXCEPTION 'Other customer read draft'; END IF;
 UPDATE public.onboarding_drafts SET current_step=1 WHERE id='de6d0127-0102-4000-8000-000000000001'; GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Other customer reset draft'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','de6d0127-0101-4000-8000-000000000001',true);
INSERT INTO public.events(id,user_id,name,onboarding_draft_id) VALUES('de6d0127-0103-4000-8000-000000000001','de6d0127-0101-4000-8000-000000000001','Onboarding event fixture','de6d0127-0102-4000-8000-000000000001');
UPDATE public.onboarding_drafts SET created_event_id='de6d0127-0103-4000-8000-000000000001',completed_at=now(),current_step=10 WHERE id='de6d0127-0102-4000-8000-000000000001';
DO $$ DECLARE rejected boolean:=false; constraint_name text; BEGIN
 BEGIN
 INSERT INTO public.events(user_id,name,onboarding_draft_id) VALUES('de6d0127-0101-4000-8000-000000000001','Duplicate completion attempt','de6d0127-0102-4000-8000-000000000001');
 EXCEPTION WHEN unique_violation THEN
 GET STACKED DIAGNOSTICS constraint_name=CONSTRAINT_NAME;
 IF constraint_name<>'events_onboarding_draft_id_uidx' THEN RAISE; END IF;
 rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Draft created duplicate events'; END IF;
 IF (SELECT count(*) FROM public.events WHERE onboarding_draft_id='de6d0127-0102-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Unexpected draft event count'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.onboarding_drafts WHERE id='de6d0127-0102-4000-8000-000000000001' AND created_event_id='de6d0127-0103-4000-8000-000000000001' AND completed_at IS NOT NULL AND current_step=10 AND answers->>'partner1Name'='QA') THEN RAISE EXCEPTION 'Completion lost original draft'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: draft progress/answers can be read back and updated; other account cannot read/reset draft; completion links saved event; duplicate event for same draft rejected by unique draft index; original data retained. Fixtures rolled back.' AS result;
ROLLBACK;