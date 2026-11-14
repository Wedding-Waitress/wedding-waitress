-- Explicit Data API permissions for the historical migration chain.
-- Read-only production ACL snapshot: 2026-10-22; see docs/DATA_API_PERMISSIONS.md.
-- Named objects only. No default grants, policies, ownership or RLS changes.
-- Revoke/regrant only CRUD (tables) and USAGE/SELECT/UPDATE (sequences).
BEGIN;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."access_expiry_reminders" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."access_expiry_reminders" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."access_extension_purchases" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."access_extension_purchases" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."access_recovery_cleanup_jobs" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."access_recovery_cleanup_jobs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_invitations" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."account_invitations" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_lifecycle" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."account_lifecycle" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."account_lifecycle" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_lifecycle_audit" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."account_lifecycle_audit" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."account_members" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."account_members" TO anon;
GRANT SELECT ON TABLE public."account_members" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."account_members" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."additional_event_purchases" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."additional_event_purchases" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."additional_event_purchases" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."additional_event_purchases" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."admin_account_controls" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."admin_account_controls" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_account_controls" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."admin_action_audit" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."admin_action_audit" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_action_audit" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."admin_otp_codes" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_otp_codes" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_otp_codes" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_otp_codes" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."admin_payment_refunds" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."admin_payment_refunds" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."ai_seating_suggestions" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ai_seating_suggestions" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ai_seating_suggestions" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ai_seating_suggestions" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."ceremony_floor_plans" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ceremony_floor_plans" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ceremony_floor_plans" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."ceremony_floor_plans" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."communication_credits" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_credits" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_credits" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_credits" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."communication_usage" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_usage" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_usage" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."communication_usage" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."credit_transactions" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."credit_transactions" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."credit_transactions" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."credit_transactions" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."customer_account_activity" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."customer_account_activity" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."customer_account_activity" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dietary_chart_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dietary_chart_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dietary_chart_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dietary_chart_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dj_mc_items" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_items" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_items" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_items" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dj_mc_questionnaires" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_questionnaires" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_questionnaires" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_questionnaires" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dj_mc_sections" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_sections" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_sections" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_sections" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dj_mc_share_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_share_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_share_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dj_mc_share_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."djmc_pronunciation_rate_limits" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."djmc_pronunciation_rate_limits" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."dynamic_qr_codes" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dynamic_qr_codes" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dynamic_qr_codes" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."dynamic_qr_codes" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."email_delivery_events" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."email_delivery_events" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."email_send_log" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."email_send_log" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."email_unsubscribe_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."email_unsubscribe_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_budget_expenses" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_budget_expenses" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_budget_expenses" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_budget_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_budget_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_budget_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_collaborators" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_collaborators" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_collaborators" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_collaborators" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_guestbook_messages" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, UPDATE ON TABLE public."event_guestbook_messages" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_guestbook_messages" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_guestbook_messages" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_galleries" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_galleries" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_galleries" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_galleries" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_items" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, UPDATE ON TABLE public."event_media_items" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_items" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_items" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_likes" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_likes" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_likes" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_likes" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_limits" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_limits" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_limits" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_limits" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_seq_counters" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_seq_counters" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_seq_counters" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_seq_counters" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_media_upload_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_upload_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_upload_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_media_upload_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_purchases" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_purchases" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_purchases" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_purchases" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_referral_dismissals" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_referral_dismissals" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_referral_dismissals" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_referral_dismissals" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."event_shortlinks" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_shortlinks" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_shortlinks" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."event_shortlinks" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."events" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."events" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."events" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."events" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."family_group_members" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_group_members" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_group_members" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_group_members" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."family_groups" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_groups" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_groups" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."family_groups" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."floor_plan_share_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_share_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_share_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_share_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."floor_plan_templates" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_templates" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_templates" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plan_templates" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."floor_plans" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plans" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plans" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."floor_plans" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."full_seating_chart_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."full_seating_chart_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."full_seating_chart_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."full_seating_chart_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_access_attempts" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_attempts" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_attempts" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_attempts" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_access_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_access_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_activities" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_activities" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_activities" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_activities" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_addition_notification_preferences" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_addition_notification_preferences" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_addition_notification_preferences" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_addition_notifications" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_addition_notifications" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_addition_notifications" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_communication_preferences" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_communication_preferences" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_communication_preferences" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_communication_preferences" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_song_request_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_request_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_request_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_request_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_song_requests" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_requests" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_requests" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_song_requests" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guest_update_logs" FROM anon, authenticated, service_role;
GRANT DELETE, SELECT, UPDATE ON TABLE public."guest_update_logs" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_update_logs" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guest_update_logs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."guests" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guests" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guests" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."guests" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."individual_table_chart_settings" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."individual_table_chart_settings" TO authenticated;
GRANT SELECT ON TABLE public."individual_table_chart_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_card_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_card_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_card_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_card_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_designs" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_designs" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_designs" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_designs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_gallery_images" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_gallery_images" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_gallery_images" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_gallery_images" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_image_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_image_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_image_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_image_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."invitation_templates" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_templates" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_templates" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."invitation_templates" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."live_view_module_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_module_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_module_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_module_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."live_view_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."live_view_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."long_table_seat_arrangements" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."long_table_seat_arrangements" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."long_table_seat_arrangements" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."long_table_seat_arrangements" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."marketing_preference_history" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."marketing_preference_history" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."marketing_preference_history" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."marketing_preferences" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."marketing_preferences" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."marketing_preferences" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."media_password_rate_limits" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."media_password_rate_limits" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."media_password_rate_limits" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."media_password_rate_limits" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."notification_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."notification_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."notification_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."notification_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."onboarding_drafts" FROM anon, authenticated, service_role;
GRANT INSERT, SELECT, UPDATE ON TABLE public."onboarding_drafts" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."onboarding_drafts" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."organiser_phone_otp_challenges" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."organiser_phone_otp_challenges" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."organiser_phone_verifications" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."organiser_phone_verifications" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."paid_plan_purchases" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."paid_plan_purchases" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."paid_plan_purchases" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."photo_booth_background_templates" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."photo_booth_background_templates" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."photo_booth_background_templates" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."photo_booth_background_templates" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."place_card_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."place_card_gallery_images" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_gallery_images" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_gallery_images" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_gallery_images" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."place_card_image_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_image_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_image_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_image_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."place_card_image_fit_decisions" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."place_card_image_fit_decisions" TO authenticated;
GRANT SELECT ON TABLE public."place_card_image_fit_decisions" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."place_card_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."place_card_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."profiles" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."profiles" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."profiles" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."profiles" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."promotion_campaigns" FROM anon, authenticated, service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."qr_code_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_code_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_code_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_code_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."qr_design_presets" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_design_presets" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_design_presets" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_design_presets" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."qr_scan_logs" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_scan_logs" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_scan_logs" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."qr_scan_logs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."reception_collaborator_contacts" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."reception_collaborator_contacts" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."reception_collaborator_drafts" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."reception_collaborator_drafts" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."reception_collaborator_drafts" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."reception_floor_plans" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."reception_floor_plans" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."reception_floor_plans" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."reception_floor_plans" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."referral_codes" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referral_codes" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referral_codes" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referral_codes" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."referrals" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referrals" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referrals" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."referrals" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."rsvp_invite_logs" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_logs" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_logs" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_logs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."rsvp_invite_purchases" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_purchases" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_purchases" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."rsvp_invite_purchases" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."running_sheet_items" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_items" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_items" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_items" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."running_sheet_share_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_share_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_share_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheet_share_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."running_sheets" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheets" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheets" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."running_sheets" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."saved_venue_templates" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."saved_venue_templates" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."saved_venue_templates" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."saved_venue_templates" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."seating_chart_share_tokens" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."seating_chart_share_tokens" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."seating_chart_share_tokens" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."seating_chart_share_tokens" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."signage_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."signage_gallery_images" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_gallery_images" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_gallery_images" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_gallery_images" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."signage_image_categories" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_image_categories" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_image_categories" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_image_categories" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."signage_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."signage_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."sms_credits" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_credits" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_credits" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_credits" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."sms_pricing_constants" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_pricing_constants" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_pricing_constants" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_pricing_constants" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."sms_send_logs" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_send_logs" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_send_logs" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."sms_send_logs" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."subscription_plans" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."subscription_plans" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."subscription_plans" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."subscription_plans" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."support_ticket_activity" FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public."support_ticket_activity" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."support_ticket_activity" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."support_ticket_replies" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."support_ticket_replies" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."support_tickets" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."support_tickets" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."suppressed_emails" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."suppressed_emails" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."tables" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."tables" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."tables" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."tables" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."testimonial_submissions" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."testimonial_submissions" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."testimonial_submissions" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."testimonial_submissions" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."transactional_email_queue" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."transactional_email_queue" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."user_roles" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_roles" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_roles" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_roles" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."user_subscriptions" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_subscriptions" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_subscriptions" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."user_subscriptions" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."venue_floor_plan_requests" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_requests" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_requests" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_requests" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."venue_floor_plan_templates" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_templates" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_templates" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_floor_plan_templates" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."venue_invitations" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_invitations" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_invitations" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_invitations" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."venue_trial_interests" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."venue_trial_interests" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."video_wishes_settings" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_settings" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_settings" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_settings" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."video_wishes_uploads" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_uploads" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_uploads" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."video_wishes_uploads" TO service_role;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public."welcome_video_uploads" FROM anon, authenticated, service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."welcome_video_uploads" TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."welcome_video_uploads" TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public."welcome_video_uploads" TO service_role;

REVOKE USAGE, SELECT, UPDATE ON SEQUENCE public."access_expiry_reminders_id_seq" FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_expiry_reminders_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_expiry_reminders_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_expiry_reminders_id_seq" TO service_role;

REVOKE USAGE, SELECT, UPDATE ON SEQUENCE public."access_recovery_cleanup_jobs_id_seq" FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_recovery_cleanup_jobs_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_recovery_cleanup_jobs_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."access_recovery_cleanup_jobs_id_seq" TO service_role;

REVOKE USAGE, SELECT, UPDATE ON SEQUENCE public."transactional_email_queue_id_seq" FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."transactional_email_queue_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."transactional_email_queue_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."transactional_email_queue_id_seq" TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
