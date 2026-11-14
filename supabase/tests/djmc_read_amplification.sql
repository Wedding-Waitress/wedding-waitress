-- Rollback-only verification: no existing rows, guests or share tokens persist changes.
BEGIN;
DO $$
DECLARE q record; readonly_token text:=encode(extensions.gen_random_bytes(32),'hex');
 editable_token text:=encode(extensions.gen_random_bytes(32),'hex');
 expired_token text:=encode(extensions.gen_random_bytes(32),'hex');
 expected jsonb; actual jsonb; main record; before_sections jsonb;
BEGIN
 SELECT * INTO q FROM public.dj_mc_questionnaires LIMIT 1;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionnaire fixture required'; END IF;
 INSERT INTO public.dj_mc_share_tokens(questionnaire_id,token,permission,recipient_name,expires_at)
 VALUES(q.id,readonly_token,'view_only','Rollback-only read check',NULL),
       (q.id,editable_token,'can_edit','Rollback-only edit check',NULL),
       (q.id,expired_token,'can_edit','Rollback-only expired check',now()-interval '1 minute');
 SELECT jsonb_build_object('settings',(SELECT to_jsonb(s) FROM public.guest_song_request_settings s WHERE s.event_id=q.event_id),
 'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.slot_index),'[]'::jsonb) FROM public.guest_song_requests r WHERE r.event_id=q.event_id)) INTO expected;
 actual:=public.get_dj_mc_guest_requests_by_token(readonly_token);
 IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Guest request payload/event scope differs'; END IF;
 IF public.get_dj_mc_row_text_size_by_token(readonly_token) IS DISTINCT FROM q.row_text_size THEN RAISE EXCEPTION 'Size payload differs'; END IF;
 IF public.get_dj_mc_guest_requests_by_token(expired_token) IS NOT NULL
 OR public.get_dj_mc_guest_requests_by_token('invalid-token') IS NOT NULL
 OR public.get_dj_mc_row_text_size_by_token(expired_token) IS NOT NULL
 OR public.get_dj_mc_row_text_size_by_token('invalid-token') IS NOT NULL THEN RAISE EXCEPTION 'Invalid/expired token accepted'; END IF;
 IF public.save_dj_mc_row_text_size_by_token(readonly_token,'larger')
 OR public.update_dj_mc_guest_request_by_token(readonly_token,extensions.gen_random_uuid(),'approved',false)
 THEN RAISE EXCEPTION 'Read-only mutation accepted'; END IF;
 SELECT * INTO main FROM public.get_dj_mc_questionnaire_by_token(editable_token);
 before_sections:=main.sections;
 IF main.event_id<>q.event_id OR main.questionnaire_id<>q.id OR main.permission<>'can_edit'
 THEN RAISE EXCEPTION 'Main scope/permission differs'; END IF;
 IF NOT public.save_dj_mc_row_text_size_by_token(editable_token,'larger') THEN RAISE EXCEPTION 'Authorized save denied'; END IF;
 IF public.get_dj_mc_row_text_size_by_token(readonly_token)<>'larger' THEN RAISE EXCEPTION 'Saved size not synchronized'; END IF;
 SELECT * INTO main FROM public.get_dj_mc_questionnaire_by_token(readonly_token);
 IF main.sections IS DISTINCT FROM before_sections THEN RAISE EXCEPTION 'Questionnaire content changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.dj_mc_share_tokens WHERE token IN (readonly_token,editable_token) AND last_accessed_at IS NULL)
 THEN RAISE EXCEPTION 'Audit updates missing'; END IF;
 DELETE FROM public.dj_mc_share_tokens WHERE token=readonly_token;
 IF public.get_dj_mc_guest_requests_by_token(readonly_token) IS NOT NULL
 OR public.get_dj_mc_row_text_size_by_token(readonly_token) IS NOT NULL THEN RAISE EXCEPTION 'Revoked token accepted'; END IF;
 IF has_function_privilege('anon','private.dj_mc_share_scope(text)','EXECUTE')
 OR has_function_privilege('authenticated','private.dj_mc_share_scope(text)','EXECUTE') THEN RAISE EXCEPTION 'Private scope exposed'; END IF;
END $$;
-- Exercise the unchanged RLS under an authenticated database role. This is SQL
-- permission verification, not an authenticated HTTP/login timing measurement.
DO $$
DECLARE expected_items bigint; expected_sections bigint; expected_questionnaires bigint;
 owner_id uuid; actual bigint;
BEGIN
 SELECT user_id INTO owner_id FROM private.platform_owners LIMIT 1;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Verified owner fixture required'; END IF;
 SELECT count(*) INTO expected_items FROM public.dj_mc_items;
 SELECT count(*) INTO expected_sections FROM public.dj_mc_sections;
 SELECT count(*) INTO expected_questionnaires FROM public.dj_mc_questionnaires;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO actual FROM public.dj_mc_items;
 IF actual<>expected_items THEN RAISE EXCEPTION 'Owner item access changed'; END IF;
 SELECT count(*) INTO actual FROM public.dj_mc_sections;
 IF actual<>expected_sections THEN RAISE EXCEPTION 'Owner section access changed'; END IF;
 SELECT count(*) INTO actual FROM public.dj_mc_questionnaires;
 IF actual<>expected_questionnaires THEN RAISE EXCEPTION 'Owner questionnaire access changed'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',extensions.gen_random_uuid(),'role','authenticated')::text,true);
 IF EXISTS(SELECT 1 FROM public.dj_mc_items) OR EXISTS(SELECT 1 FROM public.dj_mc_sections)
 OR EXISTS(SELECT 1 FROM public.dj_mc_questionnaires) THEN RAISE EXCEPTION 'Unrelated account read permitted'; END IF;
 UPDATE public.dj_mc_questionnaires SET row_text_size='larger';
 IF FOUND THEN RAISE EXCEPTION 'Unrelated account update permitted'; END IF;
 EXECUTE 'RESET ROLE';
END $$;
SELECT 'passed: token scope, payload parity, authorized edits, read-only/expired/revoked denial, audit preservation' AS result;
ROLLBACK;
