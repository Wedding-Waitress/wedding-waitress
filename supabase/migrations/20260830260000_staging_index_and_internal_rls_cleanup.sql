-- Safe advisor cleanup: retain constraint-backed unique indexes, add covering
-- indexes for foreign-key maintenance, and document service-only rate state.

DROP INDEX IF EXISTS public.dynamic_qr_codes_code_uidx;
DROP INDEX IF EXISTS public.event_budget_settings_event_id_uidx;
DROP INDEX IF EXISTS public.idx_events_slug_unique;

CREATE INDEX IF NOT EXISTS idx_dj_answers_answered_by ON public.dj_answers(answered_by);
CREATE INDEX IF NOT EXISTS idx_dj_items_section_id ON public.dj_items(section_id);
CREATE INDEX IF NOT EXISTS idx_dj_mc_questionnaires_user_id ON public.dj_mc_questionnaires(user_id);
CREATE INDEX IF NOT EXISTS idx_dj_questionnaire_tokens_questionnaire_id ON public.dj_questionnaire_tokens(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_dj_questionnaires_created_by ON public.dj_questionnaires(created_by);
CREATE INDEX IF NOT EXISTS idx_dj_sections_questionnaire_id ON public.dj_sections(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_invited_by ON public.event_collaborators(invited_by);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_user_id ON public.event_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_event_guestbook_messages_event_id ON public.event_guestbook_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_items_upload_token_id ON public.event_media_items(upload_token_id);
CREATE INDEX IF NOT EXISTS idx_event_media_upload_tokens_event_id ON public.event_media_upload_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_event_media_upload_tokens_gallery_id ON public.event_media_upload_tokens(gallery_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_tokens_guest_id ON public.guest_access_tokens(guest_id);
CREATE INDEX IF NOT EXISTS idx_guests_table_id ON public.guests(table_id);
CREATE INDEX IF NOT EXISTS idx_invitation_designs_template_id ON public.invitation_designs(template_id);
CREATE INDEX IF NOT EXISTS idx_media_password_rate_limits_event_id ON public.media_password_rate_limits(event_id);
CREATE INDEX IF NOT EXISTS idx_profiles_display_countdown_event_id ON public.profiles(display_countdown_event_id);
CREATE INDEX IF NOT EXISTS idx_qr_code_settings_event_id ON public.qr_code_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_running_sheets_updated_by ON public.running_sheets(updated_by);
CREATE INDEX IF NOT EXISTS idx_user_roles_created_by ON public.user_roles(created_by);

DROP POLICY IF EXISTS "No direct access to DJMC pronunciation rate limits"
ON public.djmc_pronunciation_rate_limits;
CREATE POLICY "No direct access to DJMC pronunciation rate limits"
ON public.djmc_pronunciation_rate_limits FOR ALL USING(false) WITH CHECK(false);
