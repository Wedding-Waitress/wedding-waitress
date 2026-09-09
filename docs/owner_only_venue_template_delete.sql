-- Applied via Supabase MCP: owner_only_venue_template_delete
CREATE POLICY venue_delete_owner_guard ON public.venue_floor_plan_templates AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.has_platform_owner_access()));
CREATE POLICY venue_delete_owner_allow ON public.venue_floor_plan_templates FOR DELETE TO authenticated USING ((SELECT public.has_platform_owner_access()));
