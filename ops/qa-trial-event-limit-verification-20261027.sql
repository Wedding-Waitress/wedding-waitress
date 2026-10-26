-- QA ONLY: rollback-only authenticated authorization checks.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at,raw_user_meta_data) VALUES
('de6d0127-0021-4000-8000-000000000001','qa-event-limit-owner@example.invalid',now(),now(),'{"role":"admin","is_owner":true,"plan":"unlimited"}'),
('de6d0127-0021-4000-8000-000000000002','qa-event-limit-other@example.invalid',now(),now(),'{}');
INSERT INTO public.profiles(id,first_name) VALUES('de6d0127-0021-4000-8000-000000000001','Owner'),('de6d0127-0021-4000-8000-000000000002','Other');
SELECT set_config('request.jwt.claim.sub','de6d0127-0021-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.events(id,user_id,name) VALUES('de6d0127-0022-4000-8000-000000000001','de6d0127-0021-4000-8000-000000000001','First trial event');
DO $$ DECLARE rejected boolean:=false; BEGIN
 BEGIN
  INSERT INTO public.events(user_id,name) VALUES('de6d0127-0021-4000-8000-000000000001','Second trial event');
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WW_EVENT_LIMIT_REACHED' THEN RAISE; END IF;
  rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Trial second event allowed'; END IF;
 rejected:=false;
 BEGIN
  UPDATE public.events SET user_id='de6d0127-0021-4000-8000-000000000002' WHERE id='de6d0127-0022-4000-8000-000000000001';
 EXCEPTION WHEN insufficient_privilege OR raise_exception THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Event reassignment allowed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id='de6d0127-0021-4000-8000-000000000001') THEN RAISE EXCEPTION 'User metadata granted elevated role'; END IF;
 IF private.is_platform_owner('de6d0127-0021-4000-8000-000000000001') THEN RAISE EXCEPTION 'User metadata granted platform ownership'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id='de6d0127-0022-4000-8000-000000000001' AND user_id='de6d0127-0021-4000-8000-000000000001') THEN RAISE EXCEPTION 'Event owner changed'; END IF;
 IF (SELECT count(*) FROM public.events WHERE user_id='de6d0127-0021-4000-8000-000000000001')<>1 THEN RAISE EXCEPTION 'Trial event count incorrect'; END IF;
END $$;
SELECT 'PASS: one trial event allowed; second rejected; owner reassignment rejected; user-editable admin/owner/unlimited metadata confers no elevation. Fixtures rolled back.' AS result;
ROLLBACK;
