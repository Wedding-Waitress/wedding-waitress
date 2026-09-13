-- Withdraw the prepared integration without deleting any customer styles or restoring ambiguous global imports.
BEGIN;
REVOKE ALL ON FUNCTION public.save_individual_table_chart_settings(uuid,jsonb,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_individual_table_chart_settings(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON public.individual_table_chart_settings FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
