-- PREPARED/LOCAL ONLY. Future explicit saves; no import of ambiguous browser history.
BEGIN;
CREATE FUNCTION private.valid_individual_chart_style(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE k text; BEGIN
 IF value IS NULL OR jsonb_typeof(value)<>'object' THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(value) key WHERE key<>ALL(ARRAY[
  'tableShape','fontSize','guestTextSize','paperSize','endSeatsCount',
  'includeNames','includeDietary','includeRelation','includeGuestList','showSeatNumbers',
  'isBold','isItalic','isUnderline','largerTableNames','showLogo','enableEndSeats',
  'guestNameColor','seatNumberColor','guestListColor','dietaryColor','relationshipColor'])) THEN RETURN false; END IF;
 FOREACH k IN ARRAY ARRAY['includeNames','includeDietary','includeRelation','includeGuestList','showSeatNumbers',
  'isBold','isItalic','isUnderline','largerTableNames','showLogo','enableEndSeats'] LOOP
  IF jsonb_typeof(value->k) IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['guestNameColor','seatNumberColor','guestListColor','dietaryColor','relationshipColor'] LOOP
  IF jsonb_typeof(value->k) IS DISTINCT FROM 'string' OR (value->>k)<>ALL(ARRAY['#000000','#C62828','#1565C0','#2E7D32','#967A59','#7E57C2','#E67E22']) THEN RETURN false; END IF;
 END LOOP;
 RETURN coalesce(jsonb_typeof(value->'tableShape')='string' AND (value->>'tableShape')=ANY(ARRAY['round','square','long'])
  AND jsonb_typeof(value->'fontSize')='string' AND (value->>'fontSize')=ANY(ARRAY['small','medium','large'])
  AND jsonb_typeof(value->'guestTextSize')='string' AND (value->>'guestTextSize')=ANY(ARRAY['small','standard','large'])
  AND value->'paperSize'='"A4"'::jsonb AND value->'endSeatsCount'='1'::jsonb,false);
END $$;
REVOKE ALL ON FUNCTION private.valid_individual_chart_style(jsonb) FROM PUBLIC,anon,authenticated;

CREATE TABLE public.individual_table_chart_settings(
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 settings jsonb NOT NULL CHECK(private.valid_individual_chart_style(settings)),
 revision bigint NOT NULL CHECK(revision>0 AND revision<=9007199254740991),
 last_request_id uuid NOT NULL,
 updated_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX individual_chart_settings_owner_idx ON public.individual_table_chart_settings(user_id);
ALTER TABLE public.individual_table_chart_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.individual_table_chart_settings FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.individual_table_chart_settings TO authenticated,service_role;

-- Explicit actual owner/membership. General admin event access is deliberately insufficient to save customer styles.
CREATE FUNCTION private.can_access_individual_chart_style(p_event uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.events e JOIN public.account_members am ON am.account_owner_id=e.user_id
  WHERE e.id=p_event AND am.member_user_id=auth.uid() AND am.accepted_at IS NOT NULL AND am.access_disabled_at IS NULL
   AND public.is_account_operational(e.user_id) IS TRUE
   AND NOT private.account_planning_blocked(auth.uid()) AND NOT private.admin_deleted_planning_blocked(auth.uid())
   AND NOT private.closed_account_planning_blocked(auth.uid()) AND NOT private.customer_entitlement_blocked(auth.uid())
   AND NOT private.customer_entitlement_blocked(e.user_id)
 );
$$;
REVOKE ALL ON FUNCTION private.can_access_individual_chart_style(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.can_access_individual_chart_style(uuid) TO authenticated;
CREATE POLICY "Accepted operational members read event chart styles" ON public.individual_table_chart_settings
 FOR SELECT TO authenticated USING(private.can_access_individual_chart_style(event_id));

CREATE FUNCTION public.get_individual_table_chart_settings(p_event_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
BEGIN
 IF private.can_access_individual_chart_style(p_event_id) IS NOT TRUE THEN RAISE EXCEPTION 'Operational event membership required' USING ERRCODE='42501'; END IF;
 RETURN (SELECT jsonb_build_object('event_id',s.event_id,'user_id',s.user_id,'settings',s.settings,'revision',s.revision,
  'updated_at',s.updated_at,'updated_by',s.updated_by) FROM public.individual_table_chart_settings s WHERE s.event_id=p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.get_individual_table_chart_settings(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_individual_table_chart_settings(uuid) TO authenticated;

CREATE FUNCTION public.save_individual_table_chart_settings(p_event_id uuid,p_settings jsonb,p_expected_revision bigint,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE owner_id uuid; existing public.individual_table_chart_settings%ROWTYPE; saved public.individual_table_chart_settings%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_event_id IS NULL OR p_request_id IS NULL
  OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_expected_revision>=9007199254740991
  OR private.valid_individual_chart_style(p_settings) IS NOT TRUE THEN RAISE EXCEPTION 'Complete scoped chart snapshot required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('individual-chart-style:'||p_event_id::text,0));
 IF private.can_access_individual_chart_style(p_event_id) IS NOT TRUE THEN RAISE EXCEPTION 'Operational event membership required' USING ERRCODE='42501'; END IF;
 SELECT e.user_id INTO owner_id FROM public.events e WHERE e.id=p_event_id FOR KEY SHARE;
 SELECT * INTO existing FROM public.individual_table_chart_settings WHERE event_id=p_event_id FOR UPDATE;
 IF FOUND AND existing.last_request_id=p_request_id THEN
  IF existing.updated_by<>auth.uid() OR existing.user_id<>owner_id OR existing.settings<>p_settings THEN
   RAISE EXCEPTION 'Save request evidence mismatch' USING ERRCODE='22023'; END IF;
  RETURN public.get_individual_table_chart_settings(p_event_id);
 END IF;
 IF coalesce(existing.revision,0)<>p_expected_revision THEN RAISE EXCEPTION 'Chart style changed elsewhere; reload before saving' USING ERRCODE='40001'; END IF;
 IF existing.event_id IS NOT NULL AND existing.user_id<>owner_id THEN RAISE EXCEPTION 'Event ownership changed; reviewed recovery required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.individual_table_chart_settings(event_id,user_id,settings,revision,last_request_id,updated_by)
 VALUES(p_event_id,owner_id,p_settings,p_expected_revision+1,p_request_id,auth.uid())
 ON CONFLICT(event_id) DO UPDATE SET settings=excluded.settings,revision=excluded.revision,last_request_id=excluded.last_request_id,
  updated_by=excluded.updated_by,updated_at=clock_timestamp() RETURNING * INTO saved;
 RETURN public.get_individual_table_chart_settings(p_event_id);
END $$;
REVOKE ALL ON FUNCTION public.save_individual_table_chart_settings(uuid,jsonb,bigint,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.save_individual_table_chart_settings(uuid,jsonb,bigint,uuid) TO authenticated;
COMMENT ON TABLE public.individual_table_chart_settings IS 'Explicit future owner/event-scoped chart-style snapshots. No historical global browser settings were imported.';
NOTIFY pgrst,'reload schema';
COMMIT;
