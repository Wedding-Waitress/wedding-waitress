-- Anonymous personal recipient can read and update only their permitted fields.
SET LOCAL ROLE anon;
DO $$ DECLARE ctx jsonb; BEGIN
 ctx:=public.get_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','recipient-token');
 IF ctx->>'can_edit'<>'true' OR ctx->'guest'->>'email'<>'old@example.test' THEN RAISE EXCEPTION 'Recipient context failed'; END IF;
 PERFORM public.save_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','{"email":"new@example.test","notes":"fixture"}','[]','recipient-token');
 ctx:=public.get_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','recipient-token');
 IF ctx->'guest'->>'email'<>'new@example.test' OR ctx->'guest'->>'rsvp'<>'Pending' THEN RAISE EXCEPTION 'Recipient update failed or RSVP changed'; END IF;
END $$;

-- No token, invalid token, expired token and another family member are denied.
DO $$ DECLARE token text; BEGIN
 FOREACH token IN ARRAY ARRAY[null,'invalid','expired-token'] LOOP
  BEGIN
   PERFORM public.get_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',token);
   RAISE EXCEPTION 'Unauthorised read accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
   PERFORM public.save_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','{"email":"bad@example.test"}','[]',token);
   RAISE EXCEPTION 'Unauthorised write accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END LOOP;
 BEGIN
  PERFORM public.get_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','recipient-token');
  RAISE EXCEPTION 'Family detail read accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_guest_details_form_authorized('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','{"notes":"bad"}','[]','recipient-token');
  RAISE EXCEPTION 'Cross-event write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.save_guest_details_form_authorized('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','{"seat_no":99}','[]','recipient-token');
  RAISE EXCEPTION 'Seating write accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM='Seating write accepted' THEN RAISE; END IF; END;
 IF has_function_privilege('anon','public.save_guest_details_form(uuid,uuid,jsonb,jsonb)','execute') THEN RAISE EXCEPTION 'Legacy anonymous write grant'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF has_function_privilege('anon','private.update_authorized_guest_details_fields(uuid,uuid,text,text,text,text,text,text,text,text,text)','execute') THEN RAISE EXCEPTION 'Private writer exposed'; END IF;
END $$;

-- Manager checks use server-owned roles; an unverified admin role is insufficient.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 IF public.can_manage_guest_details('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Unverified admin accepted'; END IF;
 BEGIN
  PERFORM public.save_guest_details_form('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','{"notes":"bad"}');
  RAISE EXCEPTION 'Unrelated authenticated write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.update_guest_rsvp_public('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Attending');
  RAISE EXCEPTION 'Legacy raw-ID write accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000004',true);
DO $$ BEGIN IF public.can_manage_guest_details('10000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'Inactive owner accepted'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 IF NOT public.can_manage_guest_details('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Owner denied'; END IF;
 PERFORM public.save_guest_details_form('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','{"first_name":"Family","last_name":"Fixture","notes":"owner update"}');
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
DO $$ DECLARE ctx jsonb; BEGIN
 IF NOT public.can_manage_guest_details('10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Verified admin denied'; END IF;
 PERFORM public.save_guest_details_form('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','{"first_name":"Family","last_name":"Fixture","notes":"admin update"}');
 ctx:=public.get_guest_details_form('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002');
 IF ctx->'guest'->>'notes'<>'admin update' OR ctx->>'is_manager'<>'true' THEN RAISE EXCEPTION 'Admin update failed'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT email FROM public.guests WHERE id='20000000-0000-0000-0000-000000000002')<>'private@example.test' THEN RAISE EXCEPTION 'Unrelated email changed'; END IF;
END $$;
