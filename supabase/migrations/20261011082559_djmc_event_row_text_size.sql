ALTER TABLE public.dj_mc_questionnaires ADD COLUMN IF NOT EXISTS row_text_size text NOT NULL DEFAULT 'standard' CHECK (row_text_size IN ('standard','larger'));
-- Owner calls use existing table RLS, including all entitlement restrictions.
CREATE OR REPLACE FUNCTION public.get_dj_mc_row_text_size(p_event_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT q.row_text_size FROM public.dj_mc_questionnaires q WHERE q.event_id=p_event_id;
$$;
CREATE OR REPLACE FUNCTION public.save_dj_mc_row_text_size(p_event_id uuid,new_size text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF new_size NOT IN ('standard','larger') OR new_size IS NULL THEN RETURN false; END IF;
 UPDATE public.dj_mc_questionnaires SET row_text_size=new_size WHERE event_id=p_event_id;
 RETURN FOUND;
END $$;
CREATE OR REPLACE FUNCTION public.get_dj_mc_row_text_size_by_token(share_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE scope record;
BEGIN
 SELECT * INTO scope FROM public.get_dj_mc_questionnaire_by_token(share_token);
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN (SELECT row_text_size FROM public.dj_mc_questionnaires WHERE id=scope.questionnaire_id);
END $$;
CREATE OR REPLACE FUNCTION public.save_dj_mc_row_text_size_by_token(share_token text,new_size text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE scope record;
BEGIN
 IF new_size NOT IN ('standard','larger') OR new_size IS NULL THEN RETURN false; END IF;
 SELECT * INTO scope FROM public.get_dj_mc_questionnaire_by_token(share_token);
 IF NOT FOUND OR scope.permission <> 'can_edit' THEN RETURN false; END IF;
 UPDATE public.dj_mc_questionnaires SET row_text_size=new_size WHERE id=scope.questionnaire_id;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.get_dj_mc_row_text_size(uuid),public.save_dj_mc_row_text_size(uuid,text),public.get_dj_mc_row_text_size_by_token(text),public.save_dj_mc_row_text_size_by_token(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_row_text_size(uuid),public.save_dj_mc_row_text_size(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_row_text_size_by_token(text),public.save_dj_mc_row_text_size_by_token(text,text) TO anon,authenticated;
