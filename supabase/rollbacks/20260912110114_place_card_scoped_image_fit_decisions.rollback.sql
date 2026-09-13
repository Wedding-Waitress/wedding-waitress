-- Data-preserving rollback for 20260912110114_place_card_scoped_image_fit_decisions.sql.
-- Disable the client feature before use. Preserve all explicit customer decisions.
BEGIN;
REVOKE ALL ON FUNCTION public.get_place_card_image_fit(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_place_card_image_fit(uuid,jsonb,bigint,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON public.place_card_image_fit_decisions FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.place_card_image_fit_decisions IS 'Scoped fit feature disabled by data-preserving rollback; explicit decisions retained for reviewed recovery.';
COMMIT;
