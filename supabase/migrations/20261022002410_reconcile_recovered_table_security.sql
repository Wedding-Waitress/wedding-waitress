-- Reconcile six recovered tables with read-only live catalog evidence (2026-10-22).
-- Definitions only: no customer rows or ownership changes; table grants stay in the ACL baseline.
-- Missing or different table structure aborts; never guess or drop table data.
BEGIN;
SET LOCAL search_path=pg_catalog,public,extensions;
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='event_shortlinks'; IF actual IS DISTINCT FROM '{"columns":[{"name":"id","type":"uuid","default":"gen_random_uuid()","notNull":true,"identity":"","generated":""},{"name":"event_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"slug","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"target_url","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"created_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"updated_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"click_count","type":"integer","default":"0","notNull":false,"identity":"","generated":""},{"name":"last_clicked_at","type":"timestamp with time zone","default":null,"notNull":false,"identity":"","generated":""}],"constraints":[{"name":"event_shortlinks_event_id_fkey","definition":"FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE"},{"name":"event_shortlinks_pkey","definition":"PRIMARY KEY (id)"},{"name":"event_shortlinks_slug_key","definition":"UNIQUE (slug)"}],"indexes":["CREATE UNIQUE INDEX event_shortlinks_event_id_idx ON public.event_shortlinks USING btree (event_id)","CREATE UNIQUE INDEX event_shortlinks_pkey ON public.event_shortlinks USING btree (id)","CREATE INDEX event_shortlinks_slug_idx ON public.event_shortlinks USING btree (slug)","CREATE UNIQUE INDEX event_shortlinks_slug_key ON public.event_shortlinks USING btree (slug)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table event_shortlinks differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."event_shortlinks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."event_shortlinks" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.event_shortlinks'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.event_shortlinks',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Account team creates event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team deletes event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR DELETE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team reads event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team updates event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id)) WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Admin deletion blocks planning access" ON public."event_shortlinks" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Anonymous can read shortlinks for live-view events" ON public."event_shortlinks" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_shortlinks.event_id) AND (e.qr_apply_to_live_view = true)))));
CREATE POLICY "Closed account blocks planning access" ON public."event_shortlinks" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Current entitlement required for planning" ON public."event_shortlinks" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Prelaunch verified owner access" ON public."event_shortlinks" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
CREATE POLICY "Suspension blocks planning access" ON public."event_shortlinks" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can create shortlinks for their events" ON public."event_shortlinks" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_shortlinks.event_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Users can update their own event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_shortlinks.event_id) AND (e.user_id = auth.uid())))));
CREATE POLICY "Users can view their own event shortlinks" ON public."event_shortlinks" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = event_shortlinks.event_id) AND (e.user_id = auth.uid())))));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.event_shortlinks'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.event_shortlinks',item.tgname); END LOOP; END $recovery$;
CREATE TRIGGER guard_expired_event_mutation BEFORE INSERT OR DELETE OR UPDATE ON event_shortlinks FOR EACH ROW EXECUTE FUNCTION guard_expired_event_mutation();
CREATE TRIGGER update_event_shortlinks_updated_at BEFORE UPDATE ON event_shortlinks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='floor_plan_share_tokens'; IF actual IS DISTINCT FROM '{"columns":[{"name":"id","type":"uuid","default":"gen_random_uuid()","notNull":true,"identity":"","generated":""},{"name":"event_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"user_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"kind","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"token","type":"text","default":"encode(gen_random_bytes(32), ''hex''::text)","notNull":true,"identity":"","generated":""},{"name":"permission","type":"text","default":"''view_only''::text","notNull":true,"identity":"","generated":""},{"name":"recipient_name","type":"text","default":null,"notNull":false,"identity":"","generated":""},{"name":"created_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"expires_at","type":"timestamp with time zone","default":"(now() + ''90 days''::interval)","notNull":true,"identity":"","generated":""},{"name":"last_accessed_at","type":"timestamp with time zone","default":null,"notNull":false,"identity":"","generated":""}],"constraints":[{"name":"ceremony_view_only","definition":"CHECK (kind = ''reception''::text OR permission = ''view_only''::text)"},{"name":"floor_plan_share_tokens_event_id_fkey","definition":"FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE"},{"name":"floor_plan_share_tokens_kind_check","definition":"CHECK (kind = ANY (ARRAY[''ceremony''::text, ''reception''::text]))"},{"name":"floor_plan_share_tokens_permission_check","definition":"CHECK (permission = ANY (ARRAY[''view_only''::text, ''can_edit''::text]))"},{"name":"floor_plan_share_tokens_pkey","definition":"PRIMARY KEY (id)"},{"name":"floor_plan_share_tokens_token_key","definition":"UNIQUE (token)"},{"name":"floor_plan_share_tokens_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES auth.users(id)"}],"indexes":["CREATE INDEX floor_plan_share_event ON public.floor_plan_share_tokens USING btree (event_id, kind)","CREATE UNIQUE INDEX floor_plan_share_tokens_pkey ON public.floor_plan_share_tokens USING btree (id)","CREATE UNIQUE INDEX floor_plan_share_tokens_token_key ON public.floor_plan_share_tokens USING btree (token)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table floor_plan_share_tokens differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."floor_plan_share_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."floor_plan_share_tokens" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.floor_plan_share_tokens'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.floor_plan_share_tokens',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Account team delete floor_plan_share_tokens" ON public."floor_plan_share_tokens" AS PERMISSIVE FOR DELETE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team insert floor_plan_share_tokens" ON public."floor_plan_share_tokens" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team select floor_plan_share_tokens" ON public."floor_plan_share_tokens" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team update floor_plan_share_tokens" ON public."floor_plan_share_tokens" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id)) WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Admin deletion blocks planning access" ON public."floor_plan_share_tokens" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Closed account blocks planning access" ON public."floor_plan_share_tokens" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Current entitlement required for planning" ON public."floor_plan_share_tokens" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Prelaunch verified owner access" ON public."floor_plan_share_tokens" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
CREATE POLICY "Suspension blocks planning access" ON public."floor_plan_share_tokens" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "owner_access" ON public."floor_plan_share_tokens" AS PERMISSIVE FOR ALL TO "authenticated" USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = floor_plan_share_tokens.event_id) AND ((e.user_id)::text = (auth.uid())::text)))))) WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = floor_plan_share_tokens.event_id) AND ((e.user_id)::text = (auth.uid())::text))))));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.floor_plan_share_tokens'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.floor_plan_share_tokens',item.tgname); END LOOP; END $recovery$;
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qr_design_presets'; IF actual IS DISTINCT FROM '{"columns":[{"name":"id","type":"uuid","default":"gen_random_uuid()","notNull":true,"identity":"","generated":""},{"name":"user_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"event_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"name","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"design_data","type":"jsonb","default":null,"notNull":true,"identity":"","generated":""},{"name":"created_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"updated_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""}],"constraints":[{"name":"qr_design_presets_pkey","definition":"PRIMARY KEY (id)"}],"indexes":["CREATE UNIQUE INDEX qr_design_presets_pkey ON public.qr_design_presets USING btree (id)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table qr_design_presets differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."qr_design_presets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."qr_design_presets" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.qr_design_presets'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.qr_design_presets',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Account team delete qr_design_presets" ON public."qr_design_presets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team insert qr_design_presets" ON public."qr_design_presets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team select qr_design_presets" ON public."qr_design_presets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team update qr_design_presets" ON public."qr_design_presets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id)) WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Admin deletion blocks planning access" ON public."qr_design_presets" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Closed account blocks planning access" ON public."qr_design_presets" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Current entitlement required for planning" ON public."qr_design_presets" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Prelaunch verified owner access" ON public."qr_design_presets" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
CREATE POLICY "Suspension blocks planning access" ON public."qr_design_presets" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Users can create their own QR presets" ON public."qr_design_presets" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete their own QR presets" ON public."qr_design_presets" AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own QR presets" ON public."qr_design_presets" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id));
CREATE POLICY "Users can view their own QR presets" ON public."qr_design_presets" AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = user_id));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.qr_design_presets'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.qr_design_presets',item.tgname); END LOOP; END $recovery$;
CREATE TRIGGER canonicalize_event_owner BEFORE INSERT OR UPDATE OF event_id, user_id ON qr_design_presets FOR EACH ROW EXECUTE FUNCTION canonicalize_event_row_owner();
CREATE TRIGGER guard_expired_event_mutation BEFORE INSERT OR DELETE OR UPDATE ON qr_design_presets FOR EACH ROW EXECUTE FUNCTION guard_expired_event_mutation();
CREATE TRIGGER update_qr_design_presets_updated_at BEFORE UPDATE ON qr_design_presets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='reception_collaborator_contacts'; IF actual IS DISTINCT FROM '{"columns":[{"name":"link_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_name","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_email","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_phone","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"trial_requested_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"notified_at","type":"timestamp with time zone","default":null,"notNull":false,"identity":"","generated":""}],"constraints":[{"name":"reception_collaborator_contacts_link_id_fkey","definition":"FOREIGN KEY (link_id) REFERENCES floor_plan_share_tokens(id) ON DELETE CASCADE"},{"name":"reception_collaborator_contacts_pkey","definition":"PRIMARY KEY (link_id)"}],"indexes":["CREATE UNIQUE INDEX reception_collaborator_contacts_pkey ON public.reception_collaborator_contacts USING btree (link_id)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table reception_collaborator_contacts differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."reception_collaborator_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reception_collaborator_contacts" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.reception_collaborator_contacts'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.reception_collaborator_contacts',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Admin deletion blocks planning access" ON public."reception_collaborator_contacts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Closed account blocks planning access" ON public."reception_collaborator_contacts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Current entitlement required for planning" ON public."reception_collaborator_contacts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Prelaunch verified owner access" ON public."reception_collaborator_contacts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
CREATE POLICY "Suspension blocks planning access" ON public."reception_collaborator_contacts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid))));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.reception_collaborator_contacts'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.reception_collaborator_contacts',item.tgname); END LOOP; END $recovery$;
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='reception_collaborator_drafts'; IF actual IS DISTINCT FROM '{"columns":[{"name":"link_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"event_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"payload","type":"jsonb","default":null,"notNull":true,"identity":"","generated":""},{"name":"revision","type":"integer","default":"1","notNull":true,"identity":"","generated":""},{"name":"base_updated_at","type":"timestamp with time zone","default":null,"notNull":true,"identity":"","generated":""},{"name":"updated_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""},{"name":"status","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"recipient_name","type":"text","default":null,"notNull":false,"identity":"","generated":""}],"constraints":[{"name":"reception_collaborator_drafts_event_id_fkey","definition":"FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE"},{"name":"reception_collaborator_drafts_link_id_fkey","definition":"FOREIGN KEY (link_id) REFERENCES floor_plan_share_tokens(id) ON DELETE CASCADE"},{"name":"reception_collaborator_drafts_pkey","definition":"PRIMARY KEY (link_id)"},{"name":"reception_collaborator_drafts_status_check","definition":"CHECK (status = ANY (ARRAY[''draft''::text, ''submitted''::text, ''approved''::text, ''rejected''::text]))"}],"indexes":["CREATE UNIQUE INDEX reception_collaborator_drafts_pkey ON public.reception_collaborator_drafts USING btree (link_id)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table reception_collaborator_drafts differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."reception_collaborator_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reception_collaborator_drafts" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.reception_collaborator_drafts'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.reception_collaborator_drafts',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Account team delete reception_collaborator_drafts" ON public."reception_collaborator_drafts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team insert reception_collaborator_drafts" ON public."reception_collaborator_drafts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team select reception_collaborator_drafts" ON public."reception_collaborator_drafts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Account team update reception_collaborator_drafts" ON public."reception_collaborator_drafts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (can_access_event(( SELECT auth.uid() AS uid), event_id)) WITH CHECK (can_access_event(( SELECT auth.uid() AS uid), event_id));
CREATE POLICY "Admin deletion blocks planning access" ON public."reception_collaborator_drafts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.admin_deleted_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Closed account blocks planning access" ON public."reception_collaborator_drafts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.closed_account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Current entitlement required for planning" ON public."reception_collaborator_drafts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.customer_entitlement_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "Prelaunch verified owner access" ON public."reception_collaborator_drafts" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
CREATE POLICY "Suspension blocks planning access" ON public."reception_collaborator_drafts" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid)))) WITH CHECK ((NOT private.account_planning_blocked(( SELECT auth.uid() AS uid))));
CREATE POLICY "owner_read" ON public."reception_collaborator_drafts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM events e
  WHERE ((e.id = reception_collaborator_drafts.event_id) AND ((e.user_id)::text = (auth.uid())::text)))));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.reception_collaborator_drafts'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.reception_collaborator_drafts',item.tgname); END LOOP; END $recovery$;
DO $recovery$ DECLARE actual jsonb; BEGIN SELECT jsonb_build_object('columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) order by co.conname),'[]'::jsonb) from pg_constraint co where co.conrelid=c.oid and co.contype<>'n'),'indexes',(select coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname),'[]'::jsonb) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid)) INTO actual FROM pg_class c join pg_namespace n on n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='venue_trial_interests'; IF actual IS DISTINCT FROM '{"columns":[{"name":"request_id","type":"uuid","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_name","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_email","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"venue_contact_number","type":"text","default":null,"notNull":true,"identity":"","generated":""},{"name":"created_at","type":"timestamp with time zone","default":"now()","notNull":true,"identity":"","generated":""}],"constraints":[{"name":"venue_trial_interests_pkey","definition":"PRIMARY KEY (request_id)"},{"name":"venue_trial_interests_request_id_fkey","definition":"FOREIGN KEY (request_id) REFERENCES venue_floor_plan_requests(id)"}],"indexes":["CREATE UNIQUE INDEX venue_trial_interests_pkey ON public.venue_trial_interests USING btree (request_id)"]}'::jsonb THEN RAISE EXCEPTION 'Recovered table venue_trial_interests differs from reviewed schema; reconcile in a disposable environment first'; END IF; END $recovery$;
ALTER TABLE public."venue_trial_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."venue_trial_interests" NO FORCE ROW LEVEL SECURITY;
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT polname FROM pg_policy WHERE polrelid='public.venue_trial_interests'::regclass LOOP EXECUTE format('DROP POLICY %I ON public.venue_trial_interests',item.polname); END LOOP; END $recovery$;
CREATE POLICY "Prelaunch verified owner access" ON public."venue_trial_interests" AS RESTRICTIVE FOR ALL TO "authenticated" USING (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false)) WITH CHECK (COALESCE(private.prelaunch_access_allowed(( SELECT auth.uid() AS uid)), false));
DO $recovery$ DECLARE item record; BEGIN FOR item IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.venue_trial_interests'::regclass AND NOT tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.venue_trial_interests',item.tgname); END LOOP; END $recovery$;
CREATE OR REPLACE FUNCTION public.ensure_event_shortlink()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  short_slug text;
  target_path text;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM event_shortlinks WHERE event_id = NEW.id
    ) THEN
      short_slug := public.generate_short_slug();
      target_path := '/s/' || NEW.slug;
      
      INSERT INTO event_shortlinks (event_id, slug, target_url)
      VALUES (NEW.id, short_slug, target_path);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;
REVOKE EXECUTE ON FUNCTION public."ensure_event_shortlink"() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public."ensure_event_shortlink"() TO PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.generate_short_slug()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  chars text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  new_slug text;
  attempts integer := 0;
BEGIN
  LOOP
    new_slug := '';
    FOR i IN 1..5 LOOP
      new_slug := new_slug || substr(chars, floor(random() * 62 + 1)::int, 1);
    END LOOP;
    
    IF NOT EXISTS (SELECT 1 FROM event_shortlinks WHERE event_shortlinks.slug = new_slug) THEN
      RETURN new_slug;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique short slug after 100 attempts';
    END IF;
  END LOOP;
END;
$function$
;
REVOKE EXECUTE ON FUNCTION public."generate_short_slug"() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public."generate_short_slug"() TO PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.review_reception_collaborator_draft(_link_id uuid, _revision integer, _accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare d public.reception_collaborator_drafts; p public.reception_floor_plans;
begin
 select * into d from reception_collaborator_drafts where link_id=_link_id for update;
 if not found or not exists(select 1 from events e where e.id=d.event_id and e.user_id::text=auth.uid()::text) then raise exception 'Not authorized'; end if;
 if d.status<>'submitted' or d.revision<>_revision then raise exception 'Submission changed. Reload the review'; end if;
 select * into p from reception_floor_plans where event_id=d.event_id for update;
 if _accept then
  if p.updated_at<>d.base_updated_at then raise exception 'Your layout changed after this draft began. Ask the collaborator to update their draft before approving'; end if;
  update reception_floor_plans set
    table_positions=d.payload->'table_positions',fixtures=d.payload->'fixtures',
    vendor_notes=d.payload->>'vendor_notes',manual_placement=(d.payload->>'manual_placement')::boolean,
    background_x=(d.payload#>>'{background,x}')::numeric,background_y=(d.payload#>>'{background,y}')::numeric,
    background_width=(d.payload#>>'{background,width}')::numeric,background_height=(d.payload#>>'{background,height}')::numeric,
    background_rotation=(d.payload#>>'{background,rotation}')::numeric,background_opacity=(d.payload#>>'{background,opacity}')::numeric,
    background_locked=(d.payload#>>'{background,locked}')::boolean,background_visible=(d.payload#>>'{background,visible}')::boolean,
    last_saved_at=now(),updated_at=now()
  where id=p.id;
 end if;
 update reception_collaborator_drafts set status=case when _accept then 'approved' else 'rejected' end,updated_at=now() where link_id=_link_id;
end $function$
;
REVOKE EXECUTE ON FUNCTION public."review_reception_collaborator_draft"(_link_id uuid, _revision integer, _accept boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public."review_reception_collaborator_draft"(_link_id uuid, _revision integer, _accept boolean) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.save_reception_collaborator_draft(_token text, _payload jsonb, _revision integer, _submit boolean, _base timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare l public.floor_plan_share_tokens; d public.reception_collaborator_drafts; p public.reception_floor_plans;
begin
 select * into l from floor_plan_share_tokens where token=_token and kind='reception' and permission='can_edit' and expires_at>now() for update;
 if not found then raise exception 'Editing permission expired or was revoked'; end if;
 select * into p from reception_floor_plans where event_id=l.event_id and user_id::text=l.user_id::text;
 if not found then raise exception 'Plan unavailable'; end if;
 select * into d from reception_collaborator_drafts where link_id=l.id for update;
 if coalesce(d.revision,0)<>_revision then raise exception 'Draft changed elsewhere. Reload before saving'; end if;
 if d.status is distinct from 'draft' and (_base is null or _base<>p.updated_at) then raise exception 'The couple changed this layout. Reload before starting a new draft'; end if;
 if d.status='submitted' then raise exception 'This draft is awaiting the couple review'; end if;
 insert into reception_collaborator_drafts(link_id,event_id,payload,revision,base_updated_at,status,recipient_name)
 values(l.id,l.event_id,_payload,_revision+1,case when d.status='draft' then d.base_updated_at else p.updated_at end,case when _submit then 'submitted' else 'draft' end,l.recipient_name)
 on conflict(link_id) do update set payload=excluded.payload,revision=excluded.revision,base_updated_at=excluded.base_updated_at,status=excluded.status,updated_at=now(),recipient_name=excluded.recipient_name;
 return jsonb_build_object('revision',_revision+1,'status',case when _submit then 'submitted' else 'draft' end);
end $function$
;
REVOKE EXECUTE ON FUNCTION public."save_reception_collaborator_draft"(_token text, _payload jsonb, _revision integer, _submit boolean, _base timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public."save_reception_collaborator_draft"(_token text, _payload jsonb, _revision integer, _submit boolean, _base timestamp with time zone) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
