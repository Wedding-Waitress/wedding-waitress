-- QA ONLY; rollback-only guest-details authorization checks; no external sends.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0061-4000-8000-000000000001','qa-details-owner@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name) VALUES('de6d0127-0061-4000-8000-000000000001','Owner');
INSERT INTO public.events(id,user_id,name,date,rsvp_deadline,event_timezone,allow_guest_plus_ones)
VALUES('de6d0127-0062-4000-8000-000000000001','de6d0127-0061-4000-8000-000000000001','Guest-details fixture',current_date+30,now()+interval '20 days','Australia/Melbourne',false);
INSERT INTO public.guests(id,event_id,user_id,first_name,last_name,family_group) VALUES
('de6d0127-0063-4000-8000-000000000001','de6d0127-0062-4000-8000-000000000001','de6d0127-0061-4000-8000-000000000001','Recipient','Test','qa-household'),
('de6d0127-0063-4000-8000-000000000002','de6d0127-0062-4000-8000-000000000001','de6d0127-0061-4000-8000-000000000001','Household','Test','qa-household'),
('de6d0127-0063-4000-8000-000000000003','de6d0127-0062-4000-8000-000000000001','de6d0127-0061-4000-8000-000000000001','Unrelated','Test',NULL);
INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at) VALUES
('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','synthetic-details-valid',now()+interval '1 day'),
('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000003','synthetic-details-expired',now()-interval '1 day');
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','synthetic-details-valid');
 IF ctx->'guest'->>'first_name'<>'Recipient' OR (ctx->>'can_edit')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Valid recipient unavailable'; END IF;
 ctx:=public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000002','synthetic-details-valid');
 IF ctx->'guest'->>'first_name'<>'Household' THEN RAISE EXCEPTION 'Valid household unavailable'; END IF;
 BEGIN PERFORM public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000003','synthetic-details-valid'); RAISE EXCEPTION 'Unrelated guest read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001',NULL); RAISE EXCEPTION 'No-token read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000003','synthetic-details-expired'); RAISE EXCEPTION 'Expired invitation read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000003','{"notes":"unauthorized"}','[]','synthetic-details-valid'); RAISE EXCEPTION 'Unrelated guest edit allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT public.save_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','{"dietary":"Synthetic updated dietary note"}','[]','synthetic-details-valid') THEN RAISE EXCEPTION 'Valid own update rejected'; END IF;
 BEGIN
 PERFORM public.save_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','{"table_no":99}','[]','synthetic-details-valid');
 RAISE EXCEPTION 'Guest assigned own table';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Only the organiser can assign tables and seats' THEN RAISE; END IF; END;
 BEGIN
 PERFORM public.save_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','{}','[{"first_name":"Additional","last_name":"Guest","group_choice":"separate"}]','synthetic-details-valid');
 RAISE EXCEPTION 'Guest bypassed disabled plus-ones';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Additional guests are not permitted' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.guests WHERE id='de6d0127-0063-4000-8000-000000000001' AND dietary='Synthetic updated dietary note') THEN RAISE EXCEPTION 'Own update not saved'; END IF;
 IF EXISTS(SELECT 1 FROM public.guests WHERE id='de6d0127-0063-4000-8000-000000000003' AND notes='unauthorized') THEN RAISE EXCEPTION 'Unrelated data changed'; END IF;
END $$;
UPDATE public.events SET rsvp_deadline=now()-interval '2 days' WHERE id='de6d0127-0062-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ DECLARE rejected boolean:=false; BEGIN
 IF (public.get_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','synthetic-details-valid')->>'can_edit')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Closed form still editable'; END IF;
 BEGIN PERFORM public.save_guest_details_form_authorized('de6d0127-0062-4000-8000-000000000001','de6d0127-0063-4000-8000-000000000001','{"notes":"closed update"}','[]','synthetic-details-valid');
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Guest updates are currently closed' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Closed form update accepted'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: own/household details readable with valid invitation; unrelated/no-token/expired-token reads rejected; unrelated edit rejected; valid own update saved; table assignment and disabled plus-one bypasses rejected; closed-deadline update rejected. Fixtures rolled back.' AS result;
ROLLBACK;
