-- QA ONLY. Rollback-only functional tests. Never return generated token values.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES
('de6d0127-0011-4000-8000-000000000001','qa-token-owner@example.invalid',now(),now()),
('de6d0127-0011-4000-8000-000000000002','qa-token-other@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name) VALUES('de6d0127-0011-4000-8000-000000000001','Owner'),('de6d0127-0011-4000-8000-000000000002','Other');
INSERT INTO public.events(id,user_id,name) VALUES
('de6d0127-0012-4000-8000-000000000001','de6d0127-0011-4000-8000-000000000001','Owner event'),
('de6d0127-0012-4000-8000-000000000002','de6d0127-0011-4000-8000-000000000002','Other event');
INSERT INTO public.guests(id,event_id,user_id,first_name) VALUES
('de6d0127-0013-4000-8000-000000000001','de6d0127-0012-4000-8000-000000000002','de6d0127-0011-4000-8000-000000000002','Unrelated Guest'),
('de6d0127-0013-4000-8000-000000000002','de6d0127-0012-4000-8000-000000000001','de6d0127-0011-4000-8000-000000000001','Own Guest');
-- Simulates a pre-existing malformed pairing; consumers must fail closed too.
INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at) VALUES
('de6d0127-0012-4000-8000-000000000001','de6d0127-0013-4000-8000-000000000001','synthetic-mismatched-legacy-pair',now()+interval '1 day');
SELECT set_config('request.jwt.claim.sub','de6d0127-0011-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE token_value text; BEGIN
 BEGIN
  PERFORM public.generate_guest_access_token('de6d0127-0012-4000-8000-000000000001','de6d0127-0013-4000-8000-000000000001',30);
  RAISE EXCEPTION 'Cross-event token generation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.generate_guest_access_token('de6d0127-0012-4000-8000-000000000002','de6d0127-0013-4000-8000-000000000001',30);
  RAISE EXCEPTION 'Other customer event allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 token_value:=public.generate_guest_access_token('de6d0127-0012-4000-8000-000000000001','de6d0127-0013-4000-8000-000000000002',30);
 PERFORM set_config('qa.synthetic_invitation_token',token_value,true);
 IF token_value !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE EXCEPTION 'Generated token format invalid'; END IF;
 IF (SELECT count(*) FROM public.get_guest_by_token(token_value) WHERE first_name='Own Guest')<>1 THEN RAISE EXCEPTION 'Own recipient unavailable'; END IF;
 IF NOT public.update_guest_with_token(token_value,'Attending',NULL,NULL,NULL) THEN RAISE EXCEPTION 'Valid recipient update rejected'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claim.role','anon',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.get_guest_by_token('synthetic-mismatched-legacy-pair')) THEN RAISE EXCEPTION 'Malformed pair exposed guest'; END IF;
 IF public.update_guest_with_token('synthetic-mismatched-legacy-pair','Not Attending',NULL,NULL,NULL) THEN RAISE EXCEPTION 'Malformed pair updated guest'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_guest_by_token('synthetic-invalid-token')) OR public.update_guest_with_token('synthetic-invalid-token','Attending',NULL,NULL,NULL) THEN RAISE EXCEPTION 'Invalid token permitted'; END IF;
 BEGIN
  PERFORM public.generate_guest_access_token('de6d0127-0012-4000-8000-000000000001','de6d0127-0013-4000-8000-000000000002',30);
  RAISE EXCEPTION 'Anonymous token generation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.guests WHERE id='de6d0127-0013-4000-8000-000000000002' AND rsvp='Attending') THEN RAISE EXCEPTION 'Own update not saved'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.guests WHERE id='de6d0127-0013-4000-8000-000000000001' AND rsvp='Pending') THEN RAISE EXCEPTION 'Other guest changed'; END IF;
END $$;
UPDATE public.guest_access_tokens SET expires_at=now()-interval '1 second' WHERE guest_id='de6d0127-0013-4000-8000-000000000002';
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.get_guest_by_token(current_setting('qa.synthetic_invitation_token')))
 OR public.update_guest_with_token(current_setting('qa.synthetic_invitation_token'),'Not Attending',NULL,NULL,NULL)
 THEN RAISE EXCEPTION 'Expired token permitted'; END IF;
END $$;
RESET ROLE;
UPDATE public.guest_access_tokens SET expires_at=now()+interval '1 day' WHERE guest_id='de6d0127-0013-4000-8000-000000000002';
UPDATE public.events SET qr_apply_to_live_view=false WHERE id='de6d0127-0012-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.get_guest_by_token(current_setting('qa.synthetic_invitation_token')))
 OR public.update_guest_with_token(current_setting('qa.synthetic_invitation_token'),'Not Attending',NULL,NULL,NULL)
 THEN RAISE EXCEPTION 'Disabled public access permitted'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: working 43-character token generation; owner/event/guest scope enforced; malformed, invalid, expired and disabled-event token reads/updates blocked; valid own RSVP update preserved; anonymous generation denied. Fixtures rolled back.' AS result;
ROLLBACK;
