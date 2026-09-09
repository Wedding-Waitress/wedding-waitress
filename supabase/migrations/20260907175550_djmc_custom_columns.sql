-- Additive schema only. Existing questionnaire templates and values remain intact.
ALTER TABLE public.dj_mc_sections ADD COLUMN IF NOT EXISTS custom_columns jsonb;
ALTER TABLE public.dj_mc_items ADD COLUMN IF NOT EXISTS custom_values jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.dj_mc_sections ADD CONSTRAINT djmc_custom_columns_shape CHECK(custom_columns IS NULL OR (jsonb_typeof(custom_columns)='array' AND jsonb_array_length(custom_columns) BETWEEN 1 AND 12));
ALTER TABLE public.dj_mc_items ADD CONSTRAINT djmc_custom_values_shape CHECK(jsonb_typeof(custom_values)='object');

CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
RETURNS TABLE(questionnaire_id uuid,event_id uuid,event_name text,event_date date,event_venue text,start_time time,finish_time time,ceremony_date date,ceremony_venue text,ceremony_start_time time,ceremony_finish_time time,permission text,sections jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t record;
BEGIN
  SELECT st.id token_id,st.questionnaire_id,st.permission,q.event_id INTO t FROM public.dj_mc_share_tokens st JOIN public.dj_mc_questionnaires q ON q.id=st.questionnaire_id WHERE st.token=rtrim(share_token,'=') AND (st.expires_at IS NULL OR st.expires_at>now());
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=t.token_id;
  RETURN QUERY SELECT t.questionnaire_id,e.id,e.name,e.date,e.venue,e.start_time,e.finish_time,e.ceremony_date,e.ceremony_venue,e.ceremony_start_time,e.ceremony_finish_time,t.permission,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'section_type',s.section_type,'section_label',s.section_label,'custom_columns',s.custom_columns,'order_index',s.order_index,'notes',s.notes,'is_collapsed',s.is_collapsed,'items',COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'section_id' ORDER BY i.order_index) FROM public.dj_mc_items i WHERE i.section_id=s.id),'[]'::jsonb)) ORDER BY s.order_index) FROM public.dj_mc_sections s WHERE s.questionnaire_id=t.questionnaire_id),'[]'::jsonb)
  FROM public.events e WHERE e.id=t.event_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_dj_mc_item_by_token_v2(share_token text,item_id uuid,new_value_text text DEFAULT NULL,new_music_url text DEFAULT NULL,new_row_label text DEFAULT NULL,new_song_title_artist text DEFAULT NULL,new_duration text DEFAULT NULL,new_pronunciation_audio_url text DEFAULT NULL,new_is_bold boolean DEFAULT NULL,new_is_italic boolean DEFAULT NULL,new_is_underline boolean DEFAULT NULL,new_is_section_header boolean DEFAULT NULL,new_custom_values jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN
  SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.dj_mc_items i SET custom_values=COALESCE(new_custom_values,i.custom_values),value_text=COALESCE(new_value_text,i.value_text),music_url=COALESCE(new_music_url,i.music_url),row_label=COALESCE(left(new_row_label,300),i.row_label),song_title_artist=COALESCE(new_song_title_artist,i.song_title_artist),duration=COALESCE(new_duration,i.duration),pronunciation_audio_url=COALESCE(new_pronunciation_audio_url,i.pronunciation_audio_url),is_bold=COALESCE(new_is_bold,i.is_bold),is_italic=COALESCE(new_is_italic,i.is_italic),is_underline=COALESCE(new_is_underline,i.is_underline),is_section_header=COALESCE(new_is_section_header,i.is_section_header) FROM public.dj_mc_sections s WHERE i.id=item_id AND s.id=i.section_id AND s.questionnaire_id=qid;
  IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.update_dj_mc_section_by_token_v2(share_token text,p_section_id uuid,new_section_label text DEFAULT NULL,new_notes text DEFAULT NULL,new_is_collapsed boolean DEFAULT NULL,clear_notes boolean DEFAULT false,new_custom_columns jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.dj_mc_sections SET custom_columns=COALESCE(new_custom_columns,custom_columns),section_label=COALESCE(left(new_section_label,300),section_label),notes=CASE WHEN clear_notes THEN NULL ELSE COALESCE(new_notes,notes) END,is_collapsed=COALESCE(new_is_collapsed,is_collapsed) WHERE id=p_section_id AND questionnaire_id=qid; IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_section_by_token(share_token text,p_section_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; src public.dj_mc_sections; n public.dj_mc_sections; items jsonb;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN NULL; END IF; SELECT * INTO src FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid; IF src.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.dj_mc_sections SET order_index=order_index+1 WHERE questionnaire_id=qid AND order_index>src.order_index;
  INSERT INTO public.dj_mc_sections(questionnaire_id,section_type,section_label,order_index,notes,is_collapsed,custom_columns) VALUES(qid,src.section_type,left(src.section_label||' (Copy)',300),src.order_index+1,src.notes,false,src.custom_columns) RETURNING * INTO n;
  INSERT INTO public.dj_mc_items(section_id,row_label,value_text,music_url,song_title_artist,pronunciation_audio_url,duration,order_index,is_default,is_bold,is_italic,is_underline,is_section_header,custom_values) SELECT n.id,row_label,value_text,music_url,song_title_artist,NULL,duration,order_index,false,is_bold,is_italic,is_underline,is_section_header,custom_values FROM public.dj_mc_items WHERE section_id=p_section_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.order_index),'[]'::jsonb) INTO items FROM public.dj_mc_items i WHERE i.section_id=n.id; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN to_jsonb(n)||jsonb_build_object('items',items); END $$;

CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_item_by_token(share_token text,item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; n public.dj_mc_items;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.dj_mc_items(section_id,row_label,value_text,music_url,song_title_artist,pronunciation_audio_url,duration,order_index,is_default,is_bold,is_italic,is_underline,is_section_header,custom_values)
  SELECT i.section_id,i.row_label,i.value_text,i.music_url,i.song_title_artist,NULL,i.duration,i.order_index+1,false,i.is_bold,i.is_italic,i.is_underline,i.is_section_header,i.custom_values FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id WHERE i.id=item_id AND s.questionnaire_id=qid RETURNING * INTO n;
  IF n.id IS NULL THEN RETURN NULL; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN to_jsonb(n); END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('update_dj_mc_item_by_token_v2','update_dj_mc_section_by_token_v2') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.sig); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated',f.sig);
 END LOOP;
END $$;
