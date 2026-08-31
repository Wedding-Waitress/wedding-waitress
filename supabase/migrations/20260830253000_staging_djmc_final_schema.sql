-- Final DJ/MC questionnaire schema for staging. This is intentionally
-- idempotent because the staging migration ledger predates the application.

CREATE TABLE IF NOT EXISTS public.dj_mc_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dj_mc_questionnaires_event_id_key UNIQUE (event_id)
);

CREATE TABLE IF NOT EXISTS public.dj_mc_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES public.dj_mc_questionnaires(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  section_label text NOT NULL,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  notes text,
  is_collapsed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dj_mc_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.dj_mc_sections(id) ON DELETE CASCADE,
  row_label text NOT NULL,
  value_text text,
  music_url text,
  song_title_artist text,
  pronunciation_audio_url text,
  duration text,
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_default boolean NOT NULL DEFAULT false,
  is_bold boolean NOT NULL DEFAULT false,
  is_italic boolean NOT NULL DEFAULT false,
  is_underline boolean NOT NULL DEFAULT false,
  is_section_header boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dj_mc_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id uuid NOT NULL REFERENCES public.dj_mc_questionnaires(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  permission text NOT NULL DEFAULT 'view_only' CHECK (permission IN ('view_only','can_edit')),
  recipient_name text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dj_mc_sections_questionnaire ON public.dj_mc_sections(questionnaire_id,order_index);
CREATE INDEX IF NOT EXISTS idx_dj_mc_items_section ON public.dj_mc_items(section_id,order_index);
CREATE INDEX IF NOT EXISTS idx_dj_mc_tokens_questionnaire ON public.dj_mc_share_tokens(questionnaire_id,created_at DESC);

ALTER TABLE public.dj_mc_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_mc_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_mc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_mc_share_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event members manage DJMC questionnaires" ON public.dj_mc_questionnaires;
CREATE POLICY "Event members manage DJMC questionnaires" ON public.dj_mc_questionnaires
FOR ALL TO authenticated
USING (public.can_access_event((SELECT auth.uid()),event_id))
WITH CHECK (user_id=(SELECT auth.uid()) AND public.can_access_event((SELECT auth.uid()),event_id));

DROP POLICY IF EXISTS "Event members manage DJMC sections" ON public.dj_mc_sections;
CREATE POLICY "Event members manage DJMC sections" ON public.dj_mc_sections
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));

DROP POLICY IF EXISTS "Event members manage DJMC items" ON public.dj_mc_items;
CREATE POLICY "Event members manage DJMC items" ON public.dj_mc_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_sections s JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id WHERE s.id=section_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_sections s JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id WHERE s.id=section_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));

DROP POLICY IF EXISTS "Event members manage DJMC tokens" ON public.dj_mc_share_tokens;
CREATE POLICY "Event members manage DJMC tokens" ON public.dj_mc_share_tokens
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=questionnaire_id AND public.can_access_event((SELECT auth.uid()),q.event_id)));

REVOKE ALL ON public.dj_mc_questionnaires,public.dj_mc_sections,public.dj_mc_items,public.dj_mc_share_tokens FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dj_mc_questionnaires,public.dj_mc_sections,public.dj_mc_items,public.dj_mc_share_tokens TO authenticated;

CREATE OR REPLACE FUNCTION public.update_dj_mc_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.update_dj_mc_updated_at() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS update_dj_mc_questionnaires_updated_at ON public.dj_mc_questionnaires;
CREATE TRIGGER update_dj_mc_questionnaires_updated_at BEFORE UPDATE ON public.dj_mc_questionnaires FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();
DROP TRIGGER IF EXISTS update_dj_mc_sections_updated_at ON public.dj_mc_sections;
CREATE TRIGGER update_dj_mc_sections_updated_at BEFORE UPDATE ON public.dj_mc_sections FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();
DROP TRIGGER IF EXISTS update_dj_mc_items_updated_at ON public.dj_mc_items;
CREATE TRIGGER update_dj_mc_items_updated_at BEFORE UPDATE ON public.dj_mc_items FOR EACH ROW EXECUTE FUNCTION public.update_dj_mc_updated_at();

CREATE OR REPLACE FUNCTION public.generate_dj_mc_share_token(_questionnaire_id uuid,_permission text DEFAULT 'view_only',_recipient_name text DEFAULT NULL,_validity_days integer DEFAULT 90)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE v_token text; v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.dj_mc_questionnaires q WHERE q.id=_questionnaire_id AND public.can_access_event(auth.uid(),q.event_id)) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  IF _permission NOT IN ('view_only','can_edit') OR _validity_days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'Invalid token options' USING ERRCODE='22023'; END IF;
  v_token:=rtrim(translate(encode(extensions.gen_random_bytes(32),'base64'),'/+','_-'),'=');
  v_expires:=now()+make_interval(days=>_validity_days);
  INSERT INTO public.dj_mc_share_tokens(questionnaire_id,token,permission,recipient_name,expires_at) VALUES(_questionnaire_id,v_token,_permission,left(nullif(btrim(_recipient_name),''),120),v_expires);
  RETURN v_token;
END $$;
REVOKE ALL ON FUNCTION public.generate_dj_mc_share_token(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.generate_dj_mc_share_token(uuid,text,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
RETURNS TABLE(questionnaire_id uuid,event_id uuid,event_name text,event_date date,event_venue text,start_time time,finish_time time,ceremony_date date,ceremony_venue text,ceremony_start_time time,ceremony_finish_time time,permission text,sections jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE t record;
BEGIN
  SELECT st.id token_id,st.questionnaire_id,st.permission,q.event_id INTO t FROM public.dj_mc_share_tokens st JOIN public.dj_mc_questionnaires q ON q.id=st.questionnaire_id WHERE st.token=rtrim(share_token,'=') AND (st.expires_at IS NULL OR st.expires_at>now());
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=t.token_id;
  RETURN QUERY SELECT t.questionnaire_id,e.id,e.name,e.date,e.venue,e.start_time,e.finish_time,e.ceremony_date,e.ceremony_venue,e.ceremony_start_time,e.ceremony_finish_time,t.permission,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'section_type',s.section_type,'section_label',s.section_label,'order_index',s.order_index,'notes',s.notes,'is_collapsed',s.is_collapsed,'items',COALESCE((SELECT jsonb_agg(to_jsonb(i) - 'section_id' ORDER BY i.order_index) FROM public.dj_mc_items i WHERE i.section_id=s.id),'[]'::jsonb)) ORDER BY s.order_index) FROM public.dj_mc_sections s WHERE s.questionnaire_id=t.questionnaire_id),'[]'::jsonb)
  FROM public.events e WHERE e.id=t.event_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_dj_mc_item_by_token(share_token text,item_id uuid,new_value_text text DEFAULT NULL,new_music_url text DEFAULT NULL,new_row_label text DEFAULT NULL,new_song_title_artist text DEFAULT NULL,new_duration text DEFAULT NULL,new_pronunciation_audio_url text DEFAULT NULL,new_is_bold boolean DEFAULT NULL,new_is_italic boolean DEFAULT NULL,new_is_underline boolean DEFAULT NULL,new_is_section_header boolean DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN
  SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.dj_mc_items i SET value_text=COALESCE(new_value_text,i.value_text),music_url=COALESCE(new_music_url,i.music_url),row_label=COALESCE(left(new_row_label,300),i.row_label),song_title_artist=COALESCE(new_song_title_artist,i.song_title_artist),duration=COALESCE(new_duration,i.duration),pronunciation_audio_url=COALESCE(new_pronunciation_audio_url,i.pronunciation_audio_url),is_bold=COALESCE(new_is_bold,i.is_bold),is_italic=COALESCE(new_is_italic,i.is_italic),is_underline=COALESCE(new_is_underline,i.is_underline),is_section_header=COALESCE(new_is_section_header,i.is_section_header) FROM public.dj_mc_sections s WHERE i.id=item_id AND s.id=i.section_id AND s.questionnaire_id=qid;
  IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.add_dj_mc_item_by_token(share_token text,p_section_id uuid,p_row_label text DEFAULT 'New Item',at_order_index integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; n public.dj_mc_items;
BEGIN
  SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid) THEN RETURN NULL; END IF;
  INSERT INTO public.dj_mc_items(section_id,row_label,order_index,is_default) VALUES(p_section_id,left(COALESCE(NULLIF(btrim(p_row_label),''),'New Item'),300),greatest(at_order_index,0),false) RETURNING * INTO n;
  UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN to_jsonb(n);
END $$;

CREATE OR REPLACE FUNCTION public.delete_dj_mc_item_by_token(share_token text,item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF;
  DELETE FROM public.dj_mc_items i USING public.dj_mc_sections s WHERE i.id=item_id AND s.id=i.section_id AND s.questionnaire_id=qid; IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_item_by_token(share_token text,item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; n public.dj_mc_items;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.dj_mc_items(section_id,row_label,value_text,music_url,song_title_artist,pronunciation_audio_url,duration,order_index,is_default,is_bold,is_italic,is_underline,is_section_header)
  SELECT i.section_id,i.row_label,i.value_text,i.music_url,i.song_title_artist,NULL,i.duration,i.order_index+1,false,i.is_bold,i.is_italic,i.is_underline,i.is_section_header FROM public.dj_mc_items i JOIN public.dj_mc_sections s ON s.id=i.section_id WHERE i.id=item_id AND s.questionnaire_id=qid RETURNING * INTO n;
  IF n.id IS NULL THEN RETURN NULL; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN to_jsonb(n); END $$;

CREATE OR REPLACE FUNCTION public.reorder_dj_mc_items_by_token(share_token text,p_section_id uuid,item_ids uuid[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; expected integer; provided integer; idx integer;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid) THEN RETURN false; END IF;
  SELECT count(*) INTO expected FROM public.dj_mc_items WHERE section_id=p_section_id; SELECT count(DISTINCT x) INTO provided FROM unnest(COALESCE(item_ids,'{}'::uuid[])) x;
  IF expected<>COALESCE(array_length(item_ids,1),0) OR expected<>provided OR EXISTS(SELECT 1 FROM unnest(COALESCE(item_ids,'{}'::uuid[])) x WHERE NOT EXISTS(SELECT 1 FROM public.dj_mc_items i WHERE i.id=x AND i.section_id=p_section_id)) THEN RETURN false; END IF;
  FOR idx IN 1..COALESCE(array_length(item_ids,1),0) LOOP UPDATE public.dj_mc_items SET order_index=idx-1 WHERE id=item_ids[idx] AND section_id=p_section_id; END LOOP; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.update_dj_mc_section_by_token(share_token text,p_section_id uuid,new_section_label text DEFAULT NULL,new_notes text DEFAULT NULL,new_is_collapsed boolean DEFAULT NULL,clear_notes boolean DEFAULT false)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.dj_mc_sections SET section_label=COALESCE(left(new_section_label,300),section_label),notes=CASE WHEN clear_notes THEN NULL ELSE COALESCE(new_notes,notes) END,is_collapsed=COALESCE(new_is_collapsed,is_collapsed) WHERE id=p_section_id AND questionnaire_id=qid; IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.delete_dj_mc_section_by_token(share_token text,p_section_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN false; END IF; DELETE FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid; IF NOT FOUND THEN RETURN false; END IF; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

CREATE OR REPLACE FUNCTION public.duplicate_dj_mc_section_by_token(share_token text,p_section_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; src public.dj_mc_sections; n public.dj_mc_sections; items jsonb;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND THEN RETURN NULL; END IF; SELECT * INTO src FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid; IF src.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.dj_mc_sections SET order_index=order_index+1 WHERE questionnaire_id=qid AND order_index>src.order_index;
  INSERT INTO public.dj_mc_sections(questionnaire_id,section_type,section_label,order_index,notes,is_collapsed) VALUES(qid,src.section_type,left(src.section_label||' (Copy)',300),src.order_index+1,src.notes,false) RETURNING * INTO n;
  INSERT INTO public.dj_mc_items(section_id,row_label,value_text,music_url,song_title_artist,pronunciation_audio_url,duration,order_index,is_default,is_bold,is_italic,is_underline,is_section_header) SELECT n.id,row_label,value_text,music_url,song_title_artist,NULL,duration,order_index,false,is_bold,is_italic,is_underline,is_section_header FROM public.dj_mc_items WHERE section_id=p_section_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.order_index),'[]'::jsonb) INTO items FROM public.dj_mc_items i WHERE i.section_id=n.id; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN to_jsonb(n)||jsonb_build_object('items',items); END $$;

CREATE OR REPLACE FUNCTION public.reset_dj_mc_section_by_token(share_token text,p_section_id uuid,p_default_label text,p_default_items jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE tid uuid; qid uuid; obj jsonb; idx integer:=0;
BEGIN SELECT st.id,st.questionnaire_id INTO tid,qid FROM public.dj_mc_share_tokens st WHERE st.token=rtrim(share_token,'=') AND st.permission='can_edit' AND (st.expires_at IS NULL OR st.expires_at>now()); IF NOT FOUND OR jsonb_typeof(p_default_items)<>'array' OR jsonb_array_length(p_default_items)>100 OR NOT EXISTS(SELECT 1 FROM public.dj_mc_sections WHERE id=p_section_id AND questionnaire_id=qid) THEN RETURN false; END IF;
  DELETE FROM public.dj_mc_items WHERE section_id=p_section_id; UPDATE public.dj_mc_sections SET section_label=left(COALESCE(NULLIF(btrim(p_default_label),''),'Section'),300),notes=NULL WHERE id=p_section_id;
  FOR obj IN SELECT * FROM jsonb_array_elements(p_default_items) LOOP INSERT INTO public.dj_mc_items(section_id,row_label,order_index,is_default) VALUES(p_section_id,left(COALESCE(NULLIF(btrim(obj->>'row_label'),''),'Item'),300),idx,true); idx:=idx+1; END LOOP; UPDATE public.dj_mc_share_tokens SET last_accessed_at=now() WHERE id=tid; RETURN true; END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure sig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_dj_mc_questionnaire_by_token','update_dj_mc_item_by_token','add_dj_mc_item_by_token','delete_dj_mc_item_by_token','duplicate_dj_mc_item_by_token','reorder_dj_mc_items_by_token','update_dj_mc_section_by_token','delete_dj_mc_section_by_token','duplicate_dj_mc_section_by_token','reset_dj_mc_section_by_token') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',f.sig); EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated',f.sig); END LOOP;
END $$;
