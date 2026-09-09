-- Questionnaire snapshot recovery, including custom columns.
CREATE OR REPLACE FUNCTION public.restore_dj_mc_questionnaire_snapshot(
 p_questionnaire_id uuid, p_sections jsonb, p_share_token text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sd jsonb; rd jsonb; sid uuid; rid uuid; sids uuid[] := '{}'; rids uuid[] := '{}'; allowed boolean; affected integer;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=p_questionnaire_id AND q.user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.dj_mc_share_tokens t WHERE t.questionnaire_id=p_questionnaire_id
   AND rtrim(t.token,'=')=rtrim(btrim(p_share_token),'=') AND t.permission='can_edit'
   AND (t.expires_at IS NULL OR t.expires_at>statement_timestamp())) INTO allowed;
 IF NOT allowed THEN RAISE EXCEPTION 'Edit permission required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.dj_mc_questionnaires WHERE id=p_questionnaire_id FOR UPDATE;
 IF p_sections IS NULL OR jsonb_typeof(p_sections)<>'array' OR jsonb_array_length(p_sections)>100
 OR octet_length(p_sections::text)>5242880 THEN RAISE EXCEPTION 'Invalid snapshot'; END IF;
 FOR sd IN SELECT value FROM jsonb_array_elements(p_sections) LOOP
  sid:=(sd->>'id')::uuid;
  IF sid IS NULL OR sid=ANY(sids) OR EXISTS(SELECT 1 FROM public.dj_mc_sections s WHERE s.id=sid AND s.questionnaire_id<>p_questionnaire_id)
  THEN RAISE EXCEPTION 'Invalid section'; END IF;
  sids:=array_append(sids,sid);
  IF jsonb_typeof(sd->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(sd->'items')>500 THEN RAISE EXCEPTION 'Invalid rows'; END IF;
  FOR rd IN SELECT value FROM jsonb_array_elements(sd->'items') LOOP
   rid:=(rd->>'id')::uuid;
   IF rid IS NULL OR rid=ANY(rids) OR EXISTS(SELECT 1 FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id WHERE i.id=rid AND (s.questionnaire_id<>p_questionnaire_id OR i.section_id<>sid))
   THEN RAISE EXCEPTION 'Invalid row'; END IF;
   rids:=array_append(rids,rid);
  END LOOP;
 END LOOP;
 FOR sd IN SELECT value FROM jsonb_array_elements(p_sections) LOOP
  sid:=(sd->>'id')::uuid;
  INSERT INTO public.dj_mc_sections(id,questionnaire_id,section_type,section_label,custom_columns,order_index,notes,is_collapsed)
  VALUES(sid,p_questionnaire_id,sd->>'section_type',sd->>'section_label',nullif(sd->'custom_columns','null'::jsonb),(sd->>'order_index')::integer,sd->>'notes',coalesce((sd->>'is_collapsed')::boolean,false))
  ON CONFLICT(id) DO UPDATE SET section_type=EXCLUDED.section_type,section_label=EXCLUDED.section_label,custom_columns=EXCLUDED.custom_columns,order_index=EXCLUDED.order_index,notes=EXCLUDED.notes,is_collapsed=EXCLUDED.is_collapsed WHERE public.dj_mc_sections.questionnaire_id=p_questionnaire_id; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>1 THEN RAISE EXCEPTION 'Section changed during restore'; END IF;
  FOR rd IN SELECT value FROM jsonb_array_elements(sd->'items') LOOP
   INSERT INTO public.dj_mc_items(id,section_id,row_label,value_text,song_title_artist,music_url,duration,order_index,is_default,is_bold,is_italic,is_underline,is_section_header,custom_values)
   VALUES((rd->>'id')::uuid,sid,rd->>'row_label',rd->>'value_text',rd->>'song_title_artist',rd->>'music_url',rd->>'duration',(rd->>'order_index')::integer,coalesce((rd->>'is_default')::boolean,false),coalesce((rd->>'is_bold')::boolean,false),coalesce((rd->>'is_italic')::boolean,false),coalesce((rd->>'is_underline')::boolean,false),coalesce((rd->>'is_section_header')::boolean,false),coalesce(rd->'custom_values','{}'::jsonb))
   ON CONFLICT(id) DO UPDATE SET row_label=EXCLUDED.row_label,value_text=EXCLUDED.value_text,song_title_artist=EXCLUDED.song_title_artist,music_url=EXCLUDED.music_url,duration=EXCLUDED.duration,order_index=EXCLUDED.order_index,is_default=EXCLUDED.is_default,is_bold=EXCLUDED.is_bold,is_italic=EXCLUDED.is_italic,is_underline=EXCLUDED.is_underline,is_section_header=EXCLUDED.is_section_header,custom_values=EXCLUDED.custom_values WHERE public.dj_mc_items.section_id=sid; GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>1 THEN RAISE EXCEPTION 'Row changed during restore'; END IF;
  END LOOP;
 END LOOP;
 DELETE FROM public.dj_mc_items i USING public.dj_mc_sections s WHERE i.section_id=s.id AND s.questionnaire_id=p_questionnaire_id AND NOT(i.id=ANY(rids));
 DELETE FROM public.dj_mc_sections s WHERE s.questionnaire_id=p_questionnaire_id AND NOT(s.id=ANY(sids));
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_dj_mc_questionnaire_snapshot(uuid,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_dj_mc_questionnaire_snapshot(uuid,jsonb,text) TO authenticated, anon;
