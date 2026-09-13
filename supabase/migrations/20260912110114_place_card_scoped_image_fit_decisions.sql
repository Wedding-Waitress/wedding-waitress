-- PREPARED/LOCAL ONLY. Depends on 20260912083156 operational membership guard.
-- Future explicit crop decisions only; never import historical browser storage.
BEGIN;
CREATE FUNCTION private.valid_place_card_fit_snapshot(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(value))<>6 OR jsonb_typeof(value->'x') IS DISTINCT FROM 'number'
  OR jsonb_typeof(value->'y') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
 RETURN coalesce(jsonb_typeof(value->'image_url')='string' AND length(value->>'image_url') BETWEEN 1 AND 8192
  AND value->>'image_type'=ANY(ARRAY['full','full_front','full_back'])
  AND value->>'fit'=ANY(ARRAY['cover','contain']) AND jsonb_typeof(value->'settings_id')='string'
  AND (value->>'settings_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  AND (value->>'x')::numeric BETWEEN 0 AND 100 AND (value->>'y')::numeric BETWEEN 0 AND 100,false);
END;
$$;
REVOKE ALL ON FUNCTION private.valid_place_card_fit_snapshot(jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE public.place_card_image_fit_decisions(
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 snapshot jsonb NOT NULL CHECK(private.valid_place_card_fit_snapshot(snapshot)),
 revision bigint NOT NULL CHECK(revision>0 AND revision<=9007199254740991),
 last_request_id uuid NOT NULL,
 updated_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX place_card_fit_owner_idx ON public.place_card_image_fit_decisions(user_id);
ALTER TABLE public.place_card_image_fit_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.place_card_image_fit_decisions FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.place_card_image_fit_decisions TO authenticated,service_role;
CREATE POLICY "Operational event members read explicit place card fit" ON public.place_card_image_fit_decisions
 FOR SELECT TO authenticated USING(private.can_access_individual_chart_style(event_id));
CREATE FUNCTION public.get_place_card_image_fit(p_event_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
BEGIN
 IF private.can_access_individual_chart_style(p_event_id) IS NOT TRUE THEN RAISE EXCEPTION 'Operational event membership required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('event_id',s.event_id,'user_id',s.user_id,'snapshot',s.snapshot,'revision',s.revision,'updated_at',s.updated_at,'updated_by',s.updated_by)
  FROM public.place_card_image_fit_decisions s JOIN public.events e ON e.id=s.event_id AND e.user_id=s.user_id WHERE s.event_id=p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.get_place_card_image_fit(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_place_card_image_fit(uuid) TO authenticated;
CREATE FUNCTION public.save_place_card_image_fit(p_event_id uuid,p_snapshot jsonb,p_expected_revision bigint,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE owner_id uuid; source public.place_card_settings%ROWTYPE; existing public.place_card_image_fit_decisions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_event_id IS NULL OR p_request_id IS NULL OR p_expected_revision IS NULL
  OR p_expected_revision<0 OR p_expected_revision>=9007199254740991 OR private.valid_place_card_fit_snapshot(p_snapshot) IS NOT TRUE
 THEN RAISE EXCEPTION 'Complete explicit fit snapshot required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('place-card-fit:'||p_event_id::text,0));
 IF private.can_access_individual_chart_style(p_event_id) IS NOT TRUE THEN RAISE EXCEPTION 'Operational event membership required' USING ERRCODE='42501'; END IF;
 SELECT e.user_id INTO owner_id FROM public.events e WHERE e.id=p_event_id FOR KEY SHARE;
 SELECT * INTO source FROM public.place_card_settings s WHERE s.id=(p_snapshot->>'settings_id')::uuid AND s.event_id=p_event_id AND s.user_id=owner_id FOR KEY SHARE;
 IF source.id IS NULL OR source.background_image_url IS DISTINCT FROM p_snapshot->>'image_url'
  OR source.background_image_type IS DISTINCT FROM p_snapshot->>'image_type'
  OR coalesce(source.background_image_x_position,50) IS DISTINCT FROM (p_snapshot->>'x')::numeric
  OR coalesce(source.background_image_y_position,50) IS DISTINCT FROM (p_snapshot->>'y')::numeric
 THEN RAISE EXCEPTION 'Saved artwork changed; confirm its current crop again' USING ERRCODE='40001'; END IF;
 SELECT * INTO existing FROM public.place_card_image_fit_decisions WHERE event_id=p_event_id FOR UPDATE;
 IF FOUND AND existing.last_request_id=p_request_id THEN
  IF existing.user_id<>owner_id OR existing.updated_by<>auth.uid() OR existing.snapshot<>p_snapshot THEN RAISE EXCEPTION 'Fit request evidence mismatch' USING ERRCODE='22023'; END IF;
  RETURN public.get_place_card_image_fit(p_event_id);
 END IF;
 IF coalesce(existing.revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'Fit changed elsewhere; reload before saving' USING ERRCODE='40001'; END IF;
 IF existing.event_id IS NOT NULL AND existing.user_id<>owner_id THEN RAISE EXCEPTION 'Event ownership changed; reviewed recovery required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.place_card_image_fit_decisions(event_id,user_id,snapshot,revision,last_request_id,updated_by)
 VALUES(p_event_id,owner_id,p_snapshot,p_expected_revision+1,p_request_id,auth.uid())
 ON CONFLICT(event_id) DO UPDATE SET snapshot=excluded.snapshot,revision=excluded.revision,last_request_id=excluded.last_request_id,
  updated_by=excluded.updated_by,updated_at=clock_timestamp();
 RETURN public.get_place_card_image_fit(p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.save_place_card_image_fit(uuid,jsonb,bigint,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.save_place_card_image_fit(uuid,jsonb,bigint,uuid) TO authenticated;
COMMENT ON TABLE public.place_card_image_fit_decisions IS 'Explicit future owner/event/artwork-scoped cover or contain decisions. No ambiguous historical browser settings imported.';
COMMIT;
