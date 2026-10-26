-- QA ONLY; rolled back, no external calls.
BEGIN;
INSERT INTO auth.users(id,email,created_at,updated_at) VALUES('de6d0127-0071-4000-8000-000000000001','qa-auto-lock@example.invalid',now(),now());
INSERT INTO public.profiles(id,first_name) VALUES('de6d0127-0071-4000-8000-000000000001','Owner');
INSERT INTO public.events(id,user_id,name,date,event_timezone,allow_guest_plus_ones) VALUES('de6d0127-0072-4000-8000-000000000001','de6d0127-0071-4000-8000-000000000001','Auto-lock fixture',(now() at time zone 'Australia/Melbourne')::date+8,'Australia/Melbourne',true);
INSERT INTO public.guests(id,event_id,user_id,first_name,last_name) VALUES('de6d0127-0073-4000-8000-000000000001','de6d0127-0072-4000-8000-000000000001','de6d0127-0071-4000-8000-000000000001','Guest','Test');
INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at) VALUES('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token',now()+interval '1 day');
INSERT INTO public.live_view_module_settings(event_id,rsvp_invite_config) VALUES('de6d0127-0072-4000-8000-000000000001','{}') ON CONFLICT(event_id) DO UPDATE SET rsvp_invite_config='{}';
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token');
 IF (ctx->>'can_edit')::boolean IS DISTINCT FROM true OR (ctx->>'can_rsvp')::boolean IS DISTINCT FROM true OR (ctx->>'can_add')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Day-eight access wrong'; END IF;
END $$;
RESET ROLE;
UPDATE public.events SET date=(now() at time zone 'Australia/Melbourne')::date+7 WHERE id='de6d0127-0072-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; rejected boolean:=false; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token');
 IF (ctx->>'can_edit')::boolean IS DISTINCT FROM false OR (ctx->>'can_rsvp')::boolean IS DISTINCT FROM false OR (ctx->>'can_add')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Day-seven lock wrong'; END IF;
 BEGIN PERFORM public.save_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','{"notes":"locked attempt"}','[]','synthetic-auto-lock-token');
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Guest updates are currently closed' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'Seven-day locked save accepted'; END IF;
END $$;
RESET ROLE;
UPDATE public.live_view_module_settings SET rsvp_invite_config='{"update_details_override_auto_lock":true}' WHERE event_id='de6d0127-0072-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token');
 IF (ctx->>'can_edit')::boolean IS DISTINCT FROM true OR (ctx->>'can_rsvp')::boolean IS DISTINCT FROM false OR (ctx->>'can_add')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Details-only override widened other actions'; END IF;
 IF NOT public.save_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','{"notes":"authorized override"}','[]','synthetic-auto-lock-token') THEN RAISE EXCEPTION 'Authorized details override failed'; END IF;
END $$;
RESET ROLE;
UPDATE public.live_view_module_settings SET rsvp_invite_config='{"update_details_override_auto_lock":true,"rsvp_override_auto_lock":true,"plus_one_override_auto_lock":true}' WHERE event_id='de6d0127-0072-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token');
 IF (ctx->>'can_edit')::boolean IS DISTINCT FROM true OR (ctx->>'can_rsvp')::boolean IS DISTINCT FROM true OR (ctx->>'can_add')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explicit override unavailable'; END IF;
END $$;
RESET ROLE;
UPDATE public.events SET rsvp_deadline=now()-interval '2 days' WHERE id='de6d0127-0072-4000-8000-000000000001';
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('de6d0127-0072-4000-8000-000000000001','de6d0127-0073-4000-8000-000000000001','synthetic-auto-lock-token');
 IF (ctx->>'can_edit')::boolean IS DISTINCT FROM false OR (ctx->>'can_rsvp')::boolean IS DISTINCT FROM false OR (ctx->>'can_add')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'Auto-lock override bypassed closed RSVP deadline'; END IF;
END $$;
RESET ROLE;
SELECT 'PASS: Melbourne day-eight access, exact day-seven lock, blocked locked save, action-specific override, explicit override and closed RSVP deadline precedence. Fixtures rolled back.' AS result;
ROLLBACK;