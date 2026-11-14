BEGIN;
CREATE TABLE private.removed_signup_block_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), pepper text NOT NULL);
INSERT INTO private.removed_signup_block_key VALUES(true,gen_random_uuid()::text||gen_random_uuid()::text);
CREATE TABLE private.removed_signup_blocks(email_fingerprint bytea PRIMARY KEY,blocked_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.removed_signup_block_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.removed_signup_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.removed_signup_block_key,private.removed_signup_blocks FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.removed_signup_email_blocked(p_email text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,private AS $$
 SELECT EXISTS(SELECT 1 FROM private.removed_signup_blocks b CROSS JOIN private.removed_signup_block_key k
 WHERE nullif(btrim(p_email),'') IS NOT NULL AND b.email_fingerprint=sha256(convert_to(lower(btrim(p_email))||k.pepper,'UTF8')))
$$;
REVOKE ALL ON FUNCTION private.removed_signup_email_blocked(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.guard_removed_signup_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,private AS $$
BEGIN
 IF private.removed_signup_email_blocked(NEW.email) THEN RAISE EXCEPTION 'Registration is unavailable. Please contact Wedding Waitress support.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_removed_signup_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_removed_signup_identity BEFORE INSERT OR UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION private.guard_removed_signup_identity();

-- Exact owner-authorized manifest. No wildcard deletion or reusable purge endpoint.
CREATE TEMP TABLE approved_remnant_targets(id uuid PRIMARY KEY,kind text NOT NULL,email text) ON COMMIT DROP;
INSERT INTO approved_remnant_targets(id,kind) VALUES
 ('20971aa4-7a69-4389-b0e9-2d88a44e17df','unverified_login'),
 ('93d2263f-d695-4c0d-a88b-c34e22a0aa0d','unverified_login'),
 ('cfb5616a-e3cc-4090-b7e9-813006a0368e','unverified_login'),
 ('dc3b869a-e795-404d-b477-64f882e3b7cf','unverified_login'),
 ('ffc9f79e-bf32-472f-a9ce-8c9433203862','unverified_login'),
 ('a604f718-25dc-448c-b5e9-3d2b9ebcd001','orphan_profile'),
 ('d43c88c4-f8d8-48e2-92c7-e6db6e818b41','orphan_profile');
CREATE TEMP TABLE approved_remnant_result(result jsonb) ON COMMIT DROP;
DO $cleanup$
DECLARE owner_id uuid; owner_before jsonb; owner_after jsonb; events_before text; guests_before text;
 original_guard text; target_ids uuid[]; target_emails text[]; removed_auth integer; removed_profiles integer;
BEGIN
 SELECT id INTO STRICT owner_id FROM auth.users WHERE lower(btrim(email))='naderelalfy1977@gmail.com';
 PERFORM 1 FROM auth.users WHERE id=owner_id FOR UPDATE;
 PERFORM 1 FROM public.profiles WHERE id=owner_id FOR UPDATE;
 PERFORM 1 FROM auth.users WHERE id IN(SELECT id FROM approved_remnant_targets) FOR UPDATE;
 PERFORM 1 FROM public.profiles WHERE id IN(SELECT id FROM approved_remnant_targets) FOR UPDATE;
 IF EXISTS(SELECT 1 FROM approved_remnant_targets WHERE id=owner_id) THEN RAISE EXCEPTION 'Owner cannot be a removal target'; END IF;
 IF (SELECT count(*) FROM auth.users u JOIN approved_remnant_targets t USING(id) WHERE t.kind='unverified_login' AND u.email_confirmed_at IS NULL AND NOT coalesce(u.is_anonymous,false) AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=u.id))<>5
 OR (SELECT count(*) FROM public.profiles p JOIN approved_remnant_targets t USING(id) WHERE t.kind='orphan_profile' AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p.id))<>2 THEN RAISE EXCEPTION 'Approved target classifications changed'; END IF;
 SELECT array_agg(id) INTO target_ids FROM approved_remnant_targets;
 UPDATE approved_remnant_targets t SET email=lower(btrim(coalesce((SELECT u.email FROM auth.users u WHERE u.id=t.id),(SELECT p.email FROM public.profiles p WHERE p.id=t.id))));
 SELECT array_agg(email) INTO target_emails FROM approved_remnant_targets;
 IF EXISTS(SELECT 1 FROM approved_remnant_targets WHERE email IS NULL OR email='' OR email='naderelalfy1977@gmail.com') OR (SELECT count(DISTINCT email) FROM approved_remnant_targets)<>7 THEN RAISE EXCEPTION 'Target identities unavailable or overlap owner'; END IF;
 IF EXISTS(SELECT 1 FROM public.events WHERE user_id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM public.paid_plan_purchases WHERE user_id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM public.event_purchases WHERE user_id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM storage.objects so WHERE so.owner_id=ANY(target_ids::text[])) THEN RAISE EXCEPTION 'Targets now own protected data; deletion refused'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_members WHERE (account_owner_id=ANY(target_ids) OR member_user_id=ANY(target_ids)) AND account_owner_id<>member_user_id) THEN RAISE EXCEPTION 'Cross-account membership requires separate review'; END IF;
 IF EXISTS(SELECT 1 FROM public.account_lifecycle WHERE account_owner_id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM public.admin_account_controls WHERE account_owner_id=ANY(target_ids)) THEN RAISE EXCEPTION 'Retained lifecycle requires separate review'; END IF;
 SELECT jsonb_build_object('auth',to_jsonb(u),'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=owner_id),'subscriptions',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.user_subscriptions s WHERE s.user_id=owner_id),'membership',(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.member_user_id) FROM public.account_members m WHERE m.account_owner_id=owner_id OR m.member_user_id=owner_id)) INTO owner_before FROM auth.users u WHERE u.id=owner_id;
 SELECT md5(coalesce(string_agg(to_jsonb(e)::text,'|' ORDER BY e.id),'')) INTO events_before FROM public.events e;
 SELECT md5(coalesce(string_agg(to_jsonb(g)::text,'|' ORDER BY g.id),'')) INTO guests_before FROM public.guests g;
 INSERT INTO private.removed_signup_blocks(email_fingerprint) SELECT sha256(convert_to(t.email||k.pepper,'UTF8')) FROM approved_remnant_targets t CROSS JOIN private.removed_signup_block_key k;
 -- Revoke sessions first. Auth cascades also remove refresh tokens and challenges.
 DELETE FROM auth.sessions WHERE user_id=ANY(target_ids);
 DELETE FROM public.transactional_email_queue q WHERE EXISTS(SELECT 1 FROM approved_remnant_targets t WHERE strpos(lower(q.payload::text),t.id::text)>0 OR strpos(lower(q.payload::text),t.email)>0);
 DELETE FROM public.email_send_log WHERE customer_id=ANY(target_ids) OR lower(btrim(recipient_email))=ANY(target_emails);
 DELETE FROM public.account_invitations i WHERE EXISTS(SELECT 1 FROM approved_remnant_targets t WHERE strpos(lower(to_jsonb(i)::text),t.id::text)>0 OR strpos(lower(to_jsonb(i)::text),t.email)>0);
 DELETE FROM public.account_members WHERE account_owner_id=ANY(target_ids) OR member_user_id=ANY(target_ids);
 DELETE FROM public.user_subscriptions WHERE user_id=ANY(target_ids);
 DELETE FROM private.account_trial_emails WHERE account_user_id=ANY(target_ids);
 -- The immutable trial guard is relaxed only for this transaction's exact manifest,
 -- only for the database owner, then restored byte-for-byte before commit.
 SELECT pg_get_functiondef('private.guard_immutable_trial_history()'::regprocedure) INTO original_guard;
 EXECUTE regexp_replace(original_guard,'BEGIN',
 $guard$BEGIN IF TG_OP='DELETE' AND current_user='postgres' AND EXISTS(SELECT 1 FROM pg_temp.approved_remnant_targets t WHERE (TG_TABLE_NAME='account_trial_history' AND t.id::text=to_jsonb(OLD)->>'account_user_id') OR (TG_TABLE_NAME='email_trial_history' AND t.email=to_jsonb(OLD)->>'normalized_email')) THEN RETURN OLD; END IF;$guard$);
 DELETE FROM private.account_trial_history WHERE account_user_id=ANY(target_ids);
 DELETE FROM private.email_trial_history h WHERE h.normalized_email=ANY(target_emails) AND NOT EXISTS(SELECT 1 FROM private.account_trial_emails e WHERE e.normalized_email=h.normalized_email);
 EXECUTE original_guard;
 DELETE FROM auth.audit_log_entries a WHERE strpos(lower(coalesce(a.payload::text,'')),owner_id::text)=0 AND EXISTS(SELECT 1 FROM approved_remnant_targets t WHERE strpos(lower(coalesce(a.payload::text,'')),t.id::text)>0 OR strpos(lower(coalesce(a.payload::text,'')),t.email)>0);
 DELETE FROM public.profiles WHERE id=ANY(target_ids); GET DIAGNOSTICS removed_profiles=ROW_COUNT;
 DELETE FROM auth.users WHERE id=ANY(target_ids); GET DIAGNOSTICS removed_auth=ROW_COUNT;
 IF removed_auth<>5 OR removed_profiles<>2 THEN RAISE EXCEPTION 'Removal count mismatch'; END IF;
 SELECT jsonb_build_object('auth',to_jsonb(u),'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=owner_id),'subscriptions',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.user_subscriptions s WHERE s.user_id=owner_id),'membership',(SELECT jsonb_agg(to_jsonb(m) ORDER BY m.member_user_id) FROM public.account_members m WHERE m.account_owner_id=owner_id OR m.member_user_id=owner_id)) INTO owner_after FROM auth.users u WHERE u.id=owner_id;
 IF owner_before IS DISTINCT FROM owner_after OR events_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(e)::text,'|' ORDER BY e.id),'')) FROM public.events e) OR guests_before IS DISTINCT FROM (SELECT md5(coalesce(string_agg(to_jsonb(g)::text,'|' ORDER BY g.id),'')) FROM public.guests g) THEN RAISE EXCEPTION 'Owner or wedding data changed; cleanup rolled back'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM public.profiles WHERE id=ANY(target_ids)) OR EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=ANY(target_ids)) THEN RAISE EXCEPTION 'Target customer records remain'; END IF;
 IF private.removed_signup_email_blocked('naderelalfy1977@gmail.com') OR EXISTS(SELECT 1 FROM approved_remnant_targets WHERE NOT private.removed_signup_email_blocked(email)) THEN RAISE EXCEPTION 'Signup blocking verification failed'; END IF;
 INSERT INTO approved_remnant_result VALUES(jsonb_build_object('removed_logins',removed_auth,'removed_profiles',removed_profiles,'blocked_identities',7,'owner_unchanged',true,'events_unchanged',true,'guests_unchanged',true));
END $cleanup$;
SELECT result FROM approved_remnant_result;
COMMIT;
