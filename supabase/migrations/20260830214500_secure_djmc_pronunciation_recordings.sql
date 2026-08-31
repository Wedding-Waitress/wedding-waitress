-- Secure DJ/MC pronunciation recordings. New private objects use
-- <account owner>/<event>/<DJMC item>/<random object>.<audio extension>.
-- Legacy public URLs remain untouched until a service-role copy/relink sweep
-- successfully writes pronunciation_audio_path for each recording.

ALTER TABLE public.dj_mc_items ADD COLUMN IF NOT EXISTS pronunciation_audio_path text;
ALTER TABLE public.dj_mc_items DROP CONSTRAINT IF EXISTS dj_mc_items_pronunciation_audio_path_check;
ALTER TABLE public.dj_mc_items ADD CONSTRAINT dj_mc_items_pronunciation_audio_path_check CHECK (
  pronunciation_audio_path IS NULL OR pronunciation_audio_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webm|ogg|mp4|m4a)$'
);

CREATE OR REPLACE FUNCTION public.validate_djmc_pronunciation_path() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE expected_prefix text;
BEGIN
  IF NEW.pronunciation_audio_path IS NULL THEN RETURN NEW; END IF;
  SELECT q.user_id::text||'/'||q.event_id::text||'/'||NEW.id::text||'/' INTO expected_prefix
  FROM public.dj_mc_sections s JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id WHERE s.id=NEW.section_id;
  IF expected_prefix IS NULL OR NEW.pronunciation_audio_path NOT LIKE expected_prefix||'%' THEN
    IF TG_OP='INSERT' THEN NEW.pronunciation_audio_path:=NULL; RETURN NEW; END IF;
    RAISE EXCEPTION 'Pronunciation recording path does not belong to this questionnaire item' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS validate_djmc_pronunciation_path_trigger ON public.dj_mc_items;
CREATE TRIGGER validate_djmc_pronunciation_path_trigger BEFORE INSERT OR UPDATE OF pronunciation_audio_path,section_id
ON public.dj_mc_items FOR EACH ROW EXECUTE FUNCTION public.validate_djmc_pronunciation_path();
REVOKE ALL ON FUNCTION public.validate_djmc_pronunciation_path() FROM PUBLIC,anon,authenticated;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('djmc-pronunciations','djmc-pronunciations',false,5242880,ARRAY['audio/webm','audio/ogg','audio/mp4','audio/x-m4a'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owners read DJMC pronunciation recordings" ON storage.objects;
CREATE POLICY "Owners read DJMC pronunciation recordings" ON storage.objects FOR SELECT TO authenticated USING(
  bucket_id='djmc-pronunciations' AND EXISTS(SELECT 1 FROM public.dj_mc_items i
  JOIN public.dj_mc_sections s ON s.id=i.section_id JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3] AND q.event_id::text=(storage.foldername(name))[2]
  AND q.user_id::text=(storage.foldername(name))[1] AND q.user_id=(SELECT auth.uid()))
);
DROP POLICY IF EXISTS "Owners upload DJMC pronunciation recordings" ON storage.objects;
CREATE POLICY "Owners upload DJMC pronunciation recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK(
  bucket_id='djmc-pronunciations' AND EXISTS(SELECT 1 FROM public.dj_mc_items i
  JOIN public.dj_mc_sections s ON s.id=i.section_id JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3] AND q.event_id::text=(storage.foldername(name))[2]
  AND q.user_id::text=(storage.foldername(name))[1] AND q.user_id=(SELECT auth.uid()))
);
DROP POLICY IF EXISTS "Owners delete DJMC pronunciation recordings" ON storage.objects;
CREATE POLICY "Owners delete DJMC pronunciation recordings" ON storage.objects FOR DELETE TO authenticated USING(
  bucket_id='djmc-pronunciations' AND EXISTS(SELECT 1 FROM public.dj_mc_items i
  JOIN public.dj_mc_sections s ON s.id=i.section_id JOIN public.dj_mc_questionnaires q ON q.id=s.questionnaire_id
  WHERE i.id::text=(storage.foldername(name))[3] AND q.event_id::text=(storage.foldername(name))[2]
  AND q.user_id::text=(storage.foldername(name))[1] AND q.user_id=(SELECT auth.uid()))
);

CREATE TABLE IF NOT EXISTS public.djmc_pronunciation_rate_limits(
  key_hash text NOT NULL,action text NOT NULL CHECK(action IN('sign','upload','delete')),
  window_start timestamptz NOT NULL,request_count integer NOT NULL DEFAULT 1 CHECK(request_count>0),
  PRIMARY KEY(key_hash,action,window_start)
);
ALTER TABLE public.djmc_pronunciation_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.djmc_pronunciation_rate_limits FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.consume_djmc_pronunciation_rate_limit(p_key_hash text,p_action text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE bucket_start timestamptz; current_count integer;
BEGIN
  IF (auth.jwt()->>'role') IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service role required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN('sign','upload','delete') OR p_limit<1 OR p_window_seconds<1 THEN RETURN false; END IF;
  bucket_start:=to_timestamp(floor(extract(epoch FROM clock_timestamp())/p_window_seconds)*p_window_seconds);
  INSERT INTO public.djmc_pronunciation_rate_limits(key_hash,action,window_start,request_count) VALUES(p_key_hash,p_action,bucket_start,1)
  ON CONFLICT(key_hash,action,window_start) DO UPDATE SET request_count=public.djmc_pronunciation_rate_limits.request_count+1
  RETURNING request_count INTO current_count;
  DELETE FROM public.djmc_pronunciation_rate_limits WHERE window_start<clock_timestamp()-interval '1 day';
  RETURN current_count<=p_limit;
END; $$;
REVOKE ALL ON FUNCTION public.consume_djmc_pronunciation_rate_limit(text,text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_djmc_pronunciation_rate_limit(text,text,integer,integer) TO service_role;

-- Public share payloads expose private paths only; legacy permanent URLs remain owner-only.
CREATE OR REPLACE FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text)
RETURNS TABLE(questionnaire_id uuid,event_id uuid,event_name text,event_date date,event_venue text,start_time time,finish_time time,ceremony_date date,ceremony_venue text,ceremony_start_time time,ceremony_finish_time time,permission text,sections jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE token_record record;
BEGIN
  SELECT st.*,q.id q_id,q.event_id q_event_id INTO token_record FROM dj_mc_share_tokens st
  JOIN dj_mc_questionnaires q ON q.id=st.questionnaire_id
  WHERE st.token=rtrim(share_token,'=')
  AND (st.expires_at IS NULL OR st.expires_at>now());
  IF token_record IS NULL THEN RETURN; END IF;
  UPDATE dj_mc_share_tokens SET last_accessed_at=now() WHERE id=token_record.id;
  RETURN QUERY SELECT token_record.q_id,e.id,e.name,e.date,e.venue,e.start_time,e.finish_time,e.ceremony_date,e.ceremony_venue,e.ceremony_start_time,e.ceremony_finish_time,token_record.permission,
  coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'section_type',s.section_type,'section_label',s.section_label,'order_index',s.order_index,'notes',s.notes,'is_collapsed',s.is_collapsed,'items',(
    SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'row_label',i.row_label,'value_text',i.value_text,'music_url',i.music_url,'song_title_artist',i.song_title_artist,
    'pronunciation_audio_url',NULL,'pronunciation_audio_path',i.pronunciation_audio_path,'duration',i.duration,'order_index',i.order_index,'is_default',i.is_default,
    'is_bold',i.is_bold,'is_italic',i.is_italic,'is_underline',i.is_underline,'is_section_header',i.is_section_header) ORDER BY i.order_index),'[]'::jsonb)
    FROM dj_mc_items i WHERE i.section_id=s.id)) ORDER BY s.order_index) FROM dj_mc_sections s WHERE s.questionnaire_id=token_record.q_id),'[]'::jsonb)
  FROM events e WHERE e.id=token_record.q_event_id;
END; $$;
REVOKE ALL ON FUNCTION public.get_dj_mc_questionnaire_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_questionnaire_by_token(text) TO anon,authenticated;
