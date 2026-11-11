-- Read token scope without rebuilding every section/item. Keep the existing
-- token normalization, expiry, event existence, and recipient permission rules.
CREATE OR REPLACE FUNCTION private.dj_mc_share_scope(share_token text)
RETURNS TABLE(token_id uuid, questionnaire_id uuid, event_id uuid, permission text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT st.id,q.id,q.event_id,st.permission
 FROM public.dj_mc_share_tokens st
 JOIN public.dj_mc_questionnaires q ON q.id=st.questionnaire_id
 JOIN public.events e ON e.id=q.event_id
 WHERE st.token=rtrim(share_token,'=') AND (st.expires_at IS NULL OR st.expires_at>now());
$$;
REVOKE ALL ON FUNCTION private.dj_mc_share_scope(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_dj_mc_row_text_size_by_token(share_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope record; result text;
BEGIN
 SELECT * INTO scope FROM private.dj_mc_share_scope(share_token);
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT row_text_size INTO result FROM public.dj_mc_questionnaires WHERE id=scope.questionnaire_id;
 -- Retain access auditing, but acquire its row lock after the read workload.
 UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=scope.token_id;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_dj_mc_guest_requests_by_token(share_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE scope record; result jsonb;
BEGIN
 SELECT * INTO scope FROM private.dj_mc_share_scope(share_token);
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('settings',(SELECT to_jsonb(s) FROM public.guest_song_request_settings s WHERE s.event_id=scope.event_id),
 'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.slot_index),'[]'::jsonb) FROM public.guest_song_requests r WHERE r.event_id=scope.event_id)) INTO result;
 UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=scope.token_id;
 RETURN result;
END $$;

-- Do not hold the audit-row lock while aggregating the main questionnaire.
-- Only move the existing statement; all data, validation and grants stay intact.
DO $$
DECLARE definition text; audit_statement constant text := 'UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=t.token_id;';
BEGIN
 SELECT pg_get_functiondef('public.get_dj_mc_questionnaire_by_token(text)'::regprocedure) INTO definition;
 IF position(audit_statement IN definition)=0 THEN
  RAISE EXCEPTION 'Unexpected questionnaire definition; audit statement not found';
 END IF;
 definition:=replace(definition,audit_statement,'');
 IF position('END $function$' IN definition)>0 THEN
  definition:=replace(definition,'END $function$',audit_statement || E'\nEND $function$');
 ELSIF position(E'END;\r\n$function$' IN definition)>0 THEN
  definition:=replace(definition,E'END;\r\n$function$',audit_statement || E'\nEND;\r\n$function$');
 ELSE
  RAISE EXCEPTION 'Unexpected questionnaire function ending';
 END IF;
 EXECUTE definition;
END $$;
