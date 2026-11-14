-- Use the existing event access policy for both document share generators.
-- This preserves the active-planning guard, signatures, grants, permissions,
-- secure token format and expiry, and changes no existing document/share rows.
CREATE OR REPLACE FUNCTION public.generate_dj_mc_share_token(
  _questionnaire_id uuid,
  _permission text DEFAULT 'view_only',
  _recipient_name text DEFAULT NULL,
  _validity_days integer DEFAULT 90
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _token text; _expires_at timestamptz;
BEGIN
  IF public.current_planning_account_owner() IS NULL THEN
    RAISE EXCEPTION 'Active account planning access required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dj_mc_questionnaires q
    WHERE q.id=_questionnaire_id AND public.can_access_event(auth.uid(),q.event_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to questionnaire';
  END IF;
  _token:=rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'/+','_-'),'=');
  _expires_at:=now()+(_validity_days||' days')::interval;
  INSERT INTO public.dj_mc_share_tokens(questionnaire_id,token,permission,recipient_name,expires_at)
  VALUES(_questionnaire_id,_token,_permission,_recipient_name,_expires_at);
  RETURN _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_running_sheet_share_token(
  _sheet_id uuid,
  _permission text DEFAULT 'view_only',
  _recipient_name text DEFAULT NULL,
  _validity_days integer DEFAULT 90
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _token text; _expires_at timestamptz;
BEGIN
  IF public.current_planning_account_owner() IS NULL THEN
    RAISE EXCEPTION 'Active account planning access required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.running_sheets s
    WHERE s.id=_sheet_id AND public.can_access_event(auth.uid(),s.event_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to running sheet';
  END IF;
  _token:=rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'/+','_-'),'=');
  _expires_at:=now()+(_validity_days||' days')::interval;
  INSERT INTO public.running_sheet_share_tokens(sheet_id,token,permission,recipient_name,expires_at)
  VALUES(_sheet_id,_token,_permission,_recipient_name,_expires_at);
  RETURN _token;
END;
$$;
