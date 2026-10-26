-- QA ONLY; synthetic invitation tokens and addresses; rollback-only.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0001-4000-8000-000000000004','qa-privacy-20261027@example.invalid',now(),now());
INSERT INTO public.events(id,user_id,name,slug,guest_limit,qr_apply_to_live_view) VALUES('de6d0127-0002-4000-8000-000000000004','de6d0127-0001-4000-8000-000000000004','QA privacy fixture','qa-privacy-20261027',20,true);
INSERT INTO public.guests(id,event_id,user_id,first_name,family_group,mailing_address,mailing_suburb,mailing_state,mailing_postcode,address_received) VALUES
('de6d0127-0004-4000-8000-000000000001','de6d0127-0002-4000-8000-000000000004','de6d0127-0001-4000-8000-000000000004','Recipient','qa-household','Synthetic Address A','Test','VIC','0000',true),
('de6d0127-0004-4000-8000-000000000002','de6d0127-0002-4000-8000-000000000004','de6d0127-0001-4000-8000-000000000004','Household','qa-household','Synthetic Address B','Test','VIC','0000',true),
('de6d0127-0004-4000-8000-000000000003','de6d0127-0002-4000-8000-000000000004','de6d0127-0001-4000-8000-000000000004','Unrelated',NULL,'Synthetic Private Address','Test','VIC','0000',true);
INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at) VALUES
('de6d0127-0002-4000-8000-000000000004','de6d0127-0004-4000-8000-000000000001','synthetic-qa-valid-invitation-20261027',now()+interval '1 day'),
('de6d0127-0002-4000-8000-000000000004','de6d0127-0004-4000-8000-000000000003','synthetic-qa-expired-invitation-20261027',now()-interval '1 day');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.get_public_event_with_data_secure('qa-privacy-20261027',NULL))<>3 THEN RAISE EXCEPTION 'Public seating unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_event_with_data_secure('qa-privacy-20261027',NULL) WHERE guest_mailing_address IS NOT NULL OR guest_mailing_suburb IS NOT NULL OR guest_mailing_state IS NOT NULL OR guest_mailing_postcode IS NOT NULL OR guest_address_received) THEN RAISE EXCEPTION 'Public QR leaked postal data'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_event_with_data_secure('qa-privacy-20261027','synthetic-qa-invalid')) THEN RAISE EXCEPTION 'Invalid token read guests'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_event_with_data_secure('qa-privacy-20261027','synthetic-qa-expired-invitation-20261027')) THEN RAISE EXCEPTION 'Expired token read guests'; END IF;
 IF (SELECT count(*) FROM public.get_public_event_with_data_secure('qa-privacy-20261027','synthetic-qa-valid-invitation-20261027'))<>2 THEN RAISE EXCEPTION 'Recipient household unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.get_public_event_with_data_secure('qa-privacy-20261027','synthetic-qa-valid-invitation-20261027') WHERE guest_id='de6d0127-0004-4000-8000-000000000003' OR guest_mailing_address IS NULL) THEN RAISE EXCEPTION 'Recipient scope incorrect'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: public seating preserved; four postal fields and received flag masked; invalid/expired invitations denied; valid recipient limited to own household. Fixtures rolled back.' AS result;
ROLLBACK;
