-- Recipient-scoped extension; reuse the questionnaire's existing token validation.
CREATE OR REPLACE FUNCTION public.get_dj_mc_guest_requests_by_token(share_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE scope record;
BEGIN
 SELECT * INTO scope FROM public.get_dj_mc_questionnaire_by_token(share_token);
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('settings',(SELECT to_jsonb(s) FROM public.guest_song_request_settings s WHERE s.event_id=scope.event_id),
 'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.slot_index),'[]'::jsonb) FROM public.guest_song_requests r WHERE r.event_id=scope.event_id));
END $$;
CREATE OR REPLACE FUNCTION public.update_dj_mc_guest_request_by_token(share_token text,request_id uuid,new_status text DEFAULT NULL,remove_request boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE scope record;
BEGIN
 SELECT * INTO scope FROM public.get_dj_mc_questionnaire_by_token(share_token);
 IF NOT FOUND OR scope.permission <> 'can_edit' THEN RETURN false; END IF;
 IF remove_request THEN
 DELETE FROM public.guest_song_requests r WHERE r.id=request_id AND r.event_id=scope.event_id;
 ELSE
 IF new_status NOT IN ('pending','approved','rejected') OR new_status IS NULL THEN RETURN false; END IF;
 UPDATE public.guest_song_requests r SET status=new_status,updated_at=now() WHERE r.id=request_id AND r.event_id=scope.event_id;
 END IF;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.get_dj_mc_guest_requests_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_dj_mc_guest_request_by_token(text,uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_guest_requests_by_token(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_dj_mc_guest_request_by_token(text,uuid,text,boolean) TO anon,authenticated;
