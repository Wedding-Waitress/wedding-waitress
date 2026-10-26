-- Candidate fix, applied only to QA until release approval.
CREATE OR REPLACE FUNCTION public.generate_guest_access_token(_event_id uuid, _guest_id uuid, _validity_days integer DEFAULT 30)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE _token text; _expires_at timestamptz; _owner uuid := public.current_planning_account_owner();
BEGIN
 IF _owner IS NULL THEN RAISE EXCEPTION 'Active account planning access required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.events e WHERE e.id=_event_id AND e.user_id=_owner)
 OR NOT EXISTS(SELECT 1 FROM public.guests g WHERE g.id=_guest_id AND g.event_id=_event_id) THEN
  RAISE EXCEPTION 'Unauthorized invitation recipient' USING ERRCODE='42501';
 END IF;
 IF _validity_days IS NULL OR _validity_days<1 THEN RAISE EXCEPTION 'Positive invitation validity required' USING ERRCODE='22023'; END IF;
 _token := replace(replace(rtrim(encode(extensions.gen_random_bytes(32),'base64'),'='),'/','_'),'+','-');
 _expires_at := now() + make_interval(days => _validity_days);
 INSERT INTO public.guest_access_tokens(event_id,guest_id,access_token,expires_at)
 VALUES(_event_id,_guest_id,_token,_expires_at)
 ON CONFLICT(event_id,guest_id) DO UPDATE SET access_token=EXCLUDED.access_token,expires_at=EXCLUDED.expires_at,created_at=now();
 RETURN _token;
END $function$;
REVOKE ALL ON FUNCTION public.generate_guest_access_token(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_guest_access_token(uuid,uuid,integer) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_guest_by_token(_access_token text)
RETURNS TABLE(guest_id uuid,first_name text,last_name text,table_no integer,seat_no integer,rsvp text,dietary text,event_name text,event_date date,event_venue text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
 SELECT g.id,g.first_name,g.last_name,g.table_no,g.seat_no,g.rsvp,g.dietary,e.name,e.date,e.venue
 FROM public.guest_access_tokens gat
 JOIN public.guests g ON g.id=gat.guest_id AND g.event_id=gat.event_id
 JOIN public.events e ON e.id=gat.event_id
 WHERE gat.access_token=_access_token AND gat.expires_at>now() AND e.qr_apply_to_live_view=true;
$function$;

CREATE OR REPLACE FUNCTION public.update_guest_with_token(_access_token text,_rsvp text DEFAULT NULL,_dietary text DEFAULT NULL,_mobile text DEFAULT NULL,_email text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE _guest_id uuid; _event_id uuid;
BEGIN
 SELECT gat.guest_id,gat.event_id INTO _guest_id,_event_id
 FROM public.guest_access_tokens gat
 JOIN public.guests g ON g.id=gat.guest_id AND g.event_id=gat.event_id
 JOIN public.events e ON e.id=gat.event_id
 WHERE gat.access_token=_access_token AND gat.expires_at>now() AND e.qr_apply_to_live_view=true;
 IF _guest_id IS NULL THEN RETURN false; END IF;
 UPDATE public.guests SET rsvp=COALESCE(_rsvp,rsvp),dietary=COALESCE(_dietary,dietary),mobile=COALESCE(_mobile,mobile),email=COALESCE(_email,email)
 WHERE id=_guest_id AND event_id=_event_id;
 INSERT INTO public.guest_update_logs(event_id,guest_id,payload,changed_by)
 VALUES(_event_id,_guest_id,jsonb_build_object('rsvp',_rsvp,'dietary',_dietary,'mobile',_mobile,'email',_email),'guest_with_token');
 UPDATE public.guest_access_tokens SET last_used_at=now() WHERE access_token=_access_token;
 RETURN true;
END $function$;
