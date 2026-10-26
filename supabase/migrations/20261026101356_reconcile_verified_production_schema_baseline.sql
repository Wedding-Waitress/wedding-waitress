-- Reconcile empty-branch drift against the inspected existing production schema.
-- These statements preserve live pricing and never change public/client grants.
ALTER TABLE public.invitation_card_settings ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.fulfill_additional_event_purchase(_user_id uuid, _stripe_session_id text, _stripe_price_id text, _amount integer, _currency text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  existing_purchase public.additional_event_purchases%ROWTYPE;
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required' USING ERRCODE = '42501';
  END IF;
  IF _stripe_price_id IS DISTINCT FROM 'price_1TUoZ15GzTmqOxGKDRmvofDh'
     OR _amount IS DISTINCT FROM 9900
     OR upper(_currency) IS DISTINCT FROM 'AUD' THEN
    RAISE EXCEPTION 'additional-event payment does not match the approved AUD catalogue';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id
      AND us.plan_id IN (
        '78cdab0d-d81d-4757-b7cc-f210b8b30f47'::uuid,
        '1c2c595d-e01b-4bd7-ad8e-f9d6cda0b2c8'::uuid,
        'cd10f207-2109-4546-a635-0baa68ba8213'::uuid
      )
      AND us.status IN ('active', 'trialing', 'grace_period')
      AND coalesce(us.is_read_only, false) = false
      AND (us.expires_at IS NULL OR us.expires_at >= clock_timestamp())
  ) THEN
    RAISE EXCEPTION 'a current Essential, Premium or Ultimate plan is required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(_stripe_session_id, 0));
  SELECT * INTO existing_purchase
  FROM public.additional_event_purchases p
  WHERE p.stripe_session_id = _stripe_session_id;
  IF FOUND THEN
    IF existing_purchase.user_id IS DISTINCT FROM _user_id
       OR existing_purchase.stripe_price_id IS DISTINCT FROM _stripe_price_id
       OR existing_purchase.amount IS DISTINCT FROM _amount
       OR upper(existing_purchase.currency) IS DISTINCT FROM 'AUD' THEN
      RAISE EXCEPTION 'stripe session is already associated with a different purchase';
    END IF;
  ELSE
    INSERT INTO public.additional_event_purchases (
      user_id, event_id, stripe_session_id, stripe_price_id, amount, currency, status
    ) VALUES (
      _user_id, NULL, _stripe_session_id, _stripe_price_id, _amount, 'AUD', 'paid'
    );
  END IF;

  RETURN jsonb_build_object(
    'already_fulfilled', existing_purchase.id IS NOT NULL,
    'additional_events', 1,
    'amount', 9900,
    'currency', 'AUD'
  );
END;
$function$
;
GRANT EXECUTE ON FUNCTION private.get_admin_platform_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION private.get_admin_platform_snapshot_activity() TO service_role;
GRANT EXECUTE ON FUNCTION private.get_my_account_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.account_event_access(_user_id uuid, _event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_guestbook_auto_share() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_guest_details(_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.canonicalize_event_row_owner() TO service_role;
GRANT EXECUTE ON FUNCTION public.canonicalize_team_event_qr_owner() TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_guest_addition_notification() TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_event_budget_currency(p_event_id uuid, p_from text, p_to text, p_rate numeric, p_rate_date date, p_expected_updated_at timestamp with time zone, p_expense_versions jsonb, p_budget numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_planning_account_owner() TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_my_account() TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_owned_event_secure(p_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_paid_plan_guest_capacity() TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_profile_account_master() TO service_role;
GRANT EXECUTE ON FUNCTION public.extend_starter_trial_once() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_guest_requests_by_token(share_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_questionnaire_by_token(share_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_row_text_size(p_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_dj_mc_row_text_size_by_token(share_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_events_with_guest_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_addition_sms_eligibility(_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_details_form(_event_id uuid, _guest_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _access_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_invitation_song_requests(_access_token text, _guest_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guest_song_requests_for_guest(_event_id uuid, _guest_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guestbook_auto_share(_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_account_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_account_return_eligibility() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_customer_entitlement() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_event_allowance() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_paid_access_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_trial_state() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_prelaunch_access() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_public_table_semantics(p_table_id uuid, p_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_video_wishes_attribution(_event_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_expired_event_mutation() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_private_guestbook() TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_suspended_data_request() TO service_role;
GRANT EXECUTE ON FUNCTION public.invalidate_organiser_phone_verification() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_account_master(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_guest_addition_reviewed(_event_id uuid, _guest_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.next_event_media_seq(_event_id uuid, _seq_kind text) TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_guest_owner_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_my_account() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_authenticated_customer_activity() TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_my_subscription_lifecycle() TO service_role;
GRANT EXECUTE ON FUNCTION public.reply_to_account_suspension(p_message text, p_request_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_dj_mc_questionnaire_snapshot(p_questionnaire_id uuid, p_sections jsonb, p_share_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_reception_collaborator_draft(_link_id uuid, _revision integer, _accept boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.safe_uuid(value text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_dj_mc_row_text_size(p_event_id uuid, new_size text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_dj_mc_row_text_size_by_token(share_token text, new_size text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_guest_details_form(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_guest_details_form_authorized(_event_id uuid, _guest_id uuid, _details jsonb, _additional jsonb, _access_token text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_guest_invitation_song_requests(_access_token text, _guest_id uuid, _requests jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_head_table_seating(p_table_id uuid, p_order jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_event_budget_owner() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_event_media_album(_item_id uuid, _album text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_event_media_albums(_item_ids uuid[], _album text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_event_media_guest_feature(_event_id uuid, _feature text, _enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_event_media_password(_event_id uuid, _enabled boolean, _password text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_guest_addition_email_preference(_event_id uuid, _enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_guest_addition_sms_preference(_event_id uuid, _enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_guestbook_auto_share(_event_id uuid, _enabled boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_my_marketing_preference(p_opted_in boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_subscription_download_window() TO service_role;
GRANT EXECUTE ON FUNCTION public.subscription_allows_event_edit(owner_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_dj_mc_guest_request_by_token(share_token text, request_id uuid, new_status text, remove_request boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_dj_mc_item_by_token_v2(share_token text, item_id uuid, new_value_text text, new_music_url text, new_row_label text, new_song_title_artist text, new_duration text, new_pronunciation_audio_url text, new_is_bold boolean, new_is_italic boolean, new_is_underline boolean, new_is_section_header boolean, new_custom_values jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_dj_mc_section_by_token_v2(share_token text, p_section_id uuid, new_section_label text, new_notes text, new_is_collapsed boolean, clear_notes boolean, new_custom_columns jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_event_media_branding(_event_id uuid, _theme_color text, _background_style text, _cover_image_url text, _logo_image_url text, _show_branding boolean, _background_mode text, _background_color text, _background_image_url text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_event_media_slideshow_settings(_event_id uuid, _include_photos boolean, _include_videos boolean, _albums text[], _order text, _slide_duration_sec integer, _transition text, _show_caption boolean, _loop boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_guest_rsvp_public(_guest_id uuid, _event_id uuid, _rsvp text, _dietary text, _mobile text, _email text, _notes text, _mailing_address text, _mailing_suburb text, _mailing_state text, _mailing_postcode text) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_djmc_pronunciation_path() TO service_role;
