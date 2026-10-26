-- QA ONLY; rollback-only bulk guest-capacity enforcement.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0081-4000-8000-000000000001','qa-bulk-capacity@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name) VALUES('de6d0127-0081-4000-8000-000000000001','Owner');
SELECT set_config('request.jwt.claim.sub','de6d0127-0081-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.events(id,user_id,name,guest_limit) VALUES('de6d0127-0082-4000-8000-000000000001','de6d0127-0081-4000-8000-000000000001','Bulk capacity fixture',999);
DO $$ DECLARE rejected boolean:=false; BEGIN
 BEGIN
 INSERT INTO public.guests(event_id,user_id,first_name,last_name)
 SELECT 'de6d0127-0082-4000-8000-000000000001','de6d0127-0081-4000-8000-000000000001','Bulk '||n,'Guest' FROM generate_series(1,21) n;
 EXCEPTION WHEN check_violation THEN
 IF SQLERRM<>'The event guest capacity has been reached' THEN RAISE; END IF;
 rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Bulk trial limit bypass allowed'; END IF;
 IF EXISTS(SELECT 1 FROM public.guests WHERE event_id='de6d0127-0082-4000-8000-000000000001') THEN RAISE EXCEPTION 'Rejected bulk insertion left partial guest rows'; END IF;
END $$;
INSERT INTO public.guests(event_id,user_id,first_name,last_name)
SELECT 'de6d0127-0082-4000-8000-000000000001','de6d0127-0081-4000-8000-000000000001','Valid '||n,'Guest' FROM generate_series(1,20) n;
DO $$ DECLARE rejected boolean:=false; BEGIN
 IF (SELECT count(*) FROM public.guests WHERE event_id='de6d0127-0082-4000-8000-000000000001')<>20 THEN RAISE EXCEPTION 'Valid bulk addition failed'; END IF;
 BEGIN
 INSERT INTO public.guests(event_id,user_id,first_name,last_name) VALUES('de6d0127-0082-4000-8000-000000000001','de6d0127-0081-4000-8000-000000000001','Extra','Guest');
 EXCEPTION WHEN check_violation THEN rejected:=true; END;
 IF NOT rejected OR (SELECT count(*) FROM public.guests WHERE event_id='de6d0127-0082-4000-8000-000000000001')<>20 THEN RAISE EXCEPTION 'Single overflow altered full guest list'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: event limit 999 does not override Starter 20; 21-row bulk insertion rejected atomically; valid 20-row bulk insertion succeeds; extra guest rejected without altering existing 20. Fixtures rolled back.' AS result;
ROLLBACK;