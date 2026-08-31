-- Authoritative, privacy-minimised reporting for the five-page Admin Centre.
-- This is intentionally a new RPC so the existing deployed snapshot remains
-- available until this forward-only migration is applied.
CREATE OR REPLACE FUNCTION public.get_admin_platform_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=public,auth,pg_temp
AS $$
DECLARE payload jsonb;
BEGIN
  IF NOT public.is_owner_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
  END IF;

  WITH
  guest_stats AS (
    SELECT g.event_id,
      count(*)::int guest_count,
      count(*) FILTER (WHERE g.table_id IS NOT NULL)::int seated_guest_count,
      count(*) FILTER (WHERE g.table_id IS NULL)::int unseated_guest_count,
      count(*) FILTER (WHERE nullif(btrim(g.dietary),'') IS NOT NULL)::int dietary_guest_count,
      count(*) FILTER (WHERE g.rsvp='attending')::int attending_count,
      count(*) FILTER (WHERE g.rsvp IN ('declined','not_attending'))::int declined_count,
      count(*) FILTER (WHERE g.rsvp_invite_sent_at IS NOT NULL OR g.rsvp_invite_status<>'not_sent')::int invitations_sent
    FROM public.guests g GROUP BY g.event_id
  ),
  table_stats AS (
    SELECT t.event_id,count(*)::int table_count,coalesce(sum(t.limit_seats),0)::int seating_capacity
    FROM public.tables t GROUP BY t.event_id
  ),
  invite_stats AS (
    SELECT l.event_id,
      count(*)::int invite_attempt_count,
      count(*) FILTER (WHERE l.status NOT IN ('failed','error'))::int invite_success_count,
      count(*) FILTER (WHERE l.channel='sms')::int sms_invite_count,
      count(*) FILTER (WHERE l.channel='email')::int email_invite_count
    FROM public.rsvp_invite_logs l GROUP BY l.event_id
  ),
  communication_stats AS (
    SELECT u.event_id,
      count(*) FILTER (WHERE u.channel='sms')::int sms_usage_count,
      count(*) FILTER (WHERE u.channel='email')::int email_usage_count
    FROM public.communication_usage u WHERE u.event_id IS NOT NULL GROUP BY u.event_id
  ),
  media_stats AS (
    SELECT m.event_id,
      count(*) FILTER (WHERE m.upload_status='uploaded' AND m.kind='photo')::int media_photo_count,
      count(*) FILTER (WHERE m.upload_status='uploaded' AND m.kind='video')::int media_video_count,
      coalesce(sum(m.byte_size) FILTER (WHERE m.upload_status='uploaded'),0)::bigint media_storage_bytes,
      count(*) FILTER (WHERE m.upload_status='uploaded' AND m.is_guestbook)::int guestbook_recording_count,
      count(*) FILTER (WHERE m.upload_status='uploaded' AND m.is_photo_booth)::int photo_booth_capture_count
    FROM public.event_media_items m GROUP BY m.event_id
  ),
  guestbook_stats AS (
    SELECT m.event_id,count(*)::int guestbook_text_count
    FROM public.event_guestbook_messages m GROUP BY m.event_id
  ),
  qr_stats AS (
    SELECT q.event_id,count(*)::int qr_scan_count FROM public.qr_scan_logs q
    WHERE q.event_id IS NOT NULL GROUP BY q.event_id
  ),
  feature_rows AS (
    SELECT event_id,'invitation_cards' feature FROM public.invitation_card_settings
    UNION ALL SELECT event_id,'seating_chart_signs' FROM public.signage_settings
    UNION ALL SELECT event_id,'place_cards' FROM public.place_card_settings
    UNION ALL SELECT event_id,'full_seating_chart' FROM public.full_seating_chart_settings
    UNION ALL SELECT event_id,'dietary_chart' FROM public.dietary_chart_settings
    UNION ALL SELECT event_id,'floor_plan' FROM public.reception_floor_plans
    UNION ALL SELECT event_id,'dj_mc_questionnaire' FROM public.dj_mc_questionnaires
    UNION ALL SELECT event_id,'run_sheet' FROM public.running_sheets
    UNION ALL SELECT event_id,'qr_code' FROM public.qr_code_settings
    UNION ALL SELECT event_id,'kiosk_live_view' FROM public.live_view_module_settings
    UNION ALL SELECT event_id,'photo_video_sharing' FROM public.event_media_galleries WHERE guest_upload_enabled OR gallery_view_enabled
    UNION ALL SELECT event_id,'digital_guestbook' FROM public.event_media_galleries WHERE guestbook_text_enabled OR video_guestbook_enabled
    UNION ALL SELECT event_id,'photo_booth' FROM public.event_media_galleries WHERE photo_booth_enabled
    UNION ALL SELECT event_id,'live_slideshow' FROM public.event_media_galleries WHERE slideshow_enabled
  ),
  feature_stats AS (
    SELECT f.event_id,count(DISTINCT f.feature)::int feature_count,
      bool_or(f.feature='invitation_cards') invitation_cards_configured,
      bool_or(f.feature='seating_chart_signs') seating_chart_signs_configured,
      bool_or(f.feature='place_cards') place_cards_configured,
      bool_or(f.feature='full_seating_chart') full_seating_chart_configured,
      bool_or(f.feature='dietary_chart') dietary_chart_configured,
      bool_or(f.feature='floor_plan') floor_plan_configured,
      bool_or(f.feature='dj_mc_questionnaire') questionnaire_configured,
      bool_or(f.feature='run_sheet') run_sheet_configured,
      bool_or(f.feature='qr_code') qr_code_configured,
      bool_or(f.feature='kiosk_live_view') kiosk_configured,
      bool_or(f.feature='photo_video_sharing') media_gallery_configured,
      bool_or(f.feature='digital_guestbook') guestbook_configured,
      bool_or(f.feature='photo_booth') photo_booth_configured,
      bool_or(f.feature='live_slideshow') slideshow_configured
    FROM feature_rows f GROUP BY f.event_id
  ),
  event_reporting AS (
    SELECT e.id,e.user_id,e.name,e.event_type,e.date,e.venue,e.created_at,
      coalesce(e.event_date_override::text,e.date::text) effective_date,
      concat_ws(' ',p.first_name,p.last_name) owner_name,p.email owner_email,
      coalesce(gs.guest_count,0) guest_count,coalesce(gs.seated_guest_count,0) seated_guest_count,
      coalesce(gs.unseated_guest_count,0) unseated_guest_count,coalesce(gs.dietary_guest_count,0) dietary_guest_count,
      coalesce(gs.invitations_sent,0) invitations_sent,coalesce(gs.attending_count,0) attending_count,
      coalesce(gs.declined_count,0) declined_count,coalesce(ts.table_count,0) table_count,
      coalesce(ts.seating_capacity,0) seating_capacity,coalesce(ins.invite_attempt_count,0) invite_attempt_count,
      coalesce(ins.invite_success_count,0) invite_success_count,coalesce(ins.sms_invite_count,0) sms_invite_count,
      coalesce(ins.email_invite_count,0) email_invite_count,coalesce(cs.sms_usage_count,0) sms_usage_count,
      coalesce(cs.email_usage_count,0) email_usage_count,coalesce(ms.media_photo_count,0) media_photo_count,
      coalesce(ms.media_video_count,0) media_video_count,coalesce(ms.media_storage_bytes,0) media_storage_bytes,
      coalesce(ms.guestbook_recording_count,0) guestbook_recording_count,
      coalesce(gbs.guestbook_text_count,0) guestbook_text_count,
      coalesce(ms.photo_booth_capture_count,0) photo_booth_capture_count,coalesce(qs.qr_scan_count,0) qr_scan_count,
      coalesce(fs.feature_count,0) feature_count,
      coalesce(fs.invitation_cards_configured,false) invitation_cards_configured,
      coalesce(fs.seating_chart_signs_configured,false) seating_chart_signs_configured,
      coalesce(fs.place_cards_configured,false) place_cards_configured,
      coalesce(fs.full_seating_chart_configured,false) full_seating_chart_configured,
      coalesce(fs.dietary_chart_configured,false) dietary_chart_configured,
      coalesce(fs.floor_plan_configured,false) floor_plan_configured,
      coalesce(fs.questionnaire_configured,false) questionnaire_configured,
      coalesce(fs.run_sheet_configured,false) run_sheet_configured,
      coalesce(fs.qr_code_configured,false) qr_code_configured,
      coalesce(fs.kiosk_configured,false) kiosk_configured,
      coalesce(fs.media_gallery_configured,false) media_gallery_configured,
      coalesce(fs.guestbook_configured,false) guestbook_configured,
      coalesce(fs.photo_booth_configured,false) photo_booth_configured,
      coalesce(fs.slideshow_configured,false) slideshow_configured,
      sp.name plan_name,
      CASE WHEN coalesce(e.event_date_override,e.date)<current_date THEN 'completed'
        WHEN coalesce(e.event_date_override,e.date)>=current_date THEN 'upcoming' ELSE 'active' END event_status
    FROM public.events e
    LEFT JOIN public.profiles p ON p.id=e.user_id
    LEFT JOIN guest_stats gs ON gs.event_id=e.id LEFT JOIN table_stats ts ON ts.event_id=e.id
    LEFT JOIN invite_stats ins ON ins.event_id=e.id LEFT JOIN communication_stats cs ON cs.event_id=e.id
    LEFT JOIN media_stats ms ON ms.event_id=e.id LEFT JOIN guestbook_stats gbs ON gbs.event_id=e.id
    LEFT JOIN qr_stats qs ON qs.event_id=e.id LEFT JOIN feature_stats fs ON fs.event_id=e.id
    LEFT JOIN LATERAL (SELECT x.plan_id FROM public.user_subscriptions x WHERE x.user_id=e.user_id ORDER BY x.updated_at DESC LIMIT 1) us ON true
    LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
  ),
  owner_usage AS (
    SELECT er.user_id,count(*)::int event_count,coalesce(sum(er.guest_count),0)::int guest_count,
      coalesce(sum(er.table_count),0)::int table_count,coalesce(sum(er.seated_guest_count),0)::int seated_guest_count,
      coalesce(sum(er.feature_count),0)::int feature_usage_count,
      coalesce(sum(er.media_photo_count+er.media_video_count),0)::int media_item_count,
      coalesce(sum(er.media_storage_bytes),0)::bigint media_storage_bytes
    FROM event_reporting er GROUP BY er.user_id
  ),
  team_stats AS (
    SELECT am.account_owner_id,count(*)::int team_member_count,
      count(*) FILTER (WHERE am.accepted_at IS NOT NULL AND am.access_disabled_at IS NULL)::int active_team_member_count
    FROM public.account_members am GROUP BY am.account_owner_id
  )
  SELECT jsonb_build_object(
    'reporting_version',2,'generated_at',now(),
    'platform_totals',jsonb_build_object(
      'customers',(SELECT count(*) FROM public.profiles p LEFT JOIN public.account_lifecycle l ON l.account_owner_id=p.id WHERE coalesce(l.status,'active') NOT IN ('scheduled_for_deletion','permanently_deleted')),
      'events',(SELECT count(*) FROM event_reporting),'tables',(SELECT coalesce(sum(table_count),0) FROM event_reporting),
      'guests',(SELECT coalesce(sum(guest_count),0) FROM event_reporting),'seated_guests',(SELECT coalesce(sum(seated_guest_count),0) FROM event_reporting),
      'invitations_sent',(SELECT coalesce(sum(invitations_sent),0) FROM event_reporting),
      'media_items',(SELECT coalesce(sum(media_photo_count+media_video_count),0) FROM event_reporting),
      'media_storage_bytes',(SELECT coalesce(sum(media_storage_bytes),0) FROM event_reporting),
      'guestbook_entries',(SELECT coalesce(sum(guestbook_text_count+guestbook_recording_count),0) FROM event_reporting),
      'photo_booth_captures',(SELECT coalesce(sum(photo_booth_capture_count),0) FROM event_reporting),
      'feature_configurations',(SELECT coalesce(sum(feature_count),0) FROM event_reporting)
    ),
    'customers',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.signup_date DESC) FROM (
      SELECT p.id,concat_ws(' ',p.first_name,p.last_name) full_name,p.email,p.mobile,p.created_at signup_date,
        u.email_confirmed_at,u.last_sign_in_at,CASE WHEN lower(coalesce(sp.name,'')) LIKE '%vendor%' THEN 'vendor' ELSE 'host' END customer_type,
        coalesce(c.status,'active') account_status,sp.name plan_name,us.status plan_status,us.started_at plan_started_at,us.expires_at plan_expires_at,
        coalesce(ou.event_count,0) event_count,coalesce(ou.guest_count,0) guest_count,coalesce(ou.table_count,0) table_count,
        coalesce(ou.seated_guest_count,0) seated_guest_count,coalesce(ou.feature_usage_count,0) feature_usage_count,
        coalesce(ou.media_item_count,0) media_item_count,coalesce(ou.media_storage_bytes,0) media_storage_bytes,
        coalesce(ts.team_member_count,0) team_member_count,coalesce(ts.active_team_member_count,0) active_team_member_count
      FROM public.profiles p JOIN auth.users u ON u.id=p.id
      LEFT JOIN LATERAL (SELECT x.* FROM public.user_subscriptions x WHERE x.user_id=p.id ORDER BY x.updated_at DESC LIMIT 1) us ON true
      LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id LEFT JOIN public.admin_account_controls c ON c.account_owner_id=p.id
      LEFT JOIN public.account_lifecycle l ON l.account_owner_id=p.id LEFT JOIN owner_usage ou ON ou.user_id=p.id LEFT JOIN team_stats ts ON ts.account_owner_id=p.id
      WHERE coalesce(l.status,'active') NOT IN ('scheduled_for_deletion','permanently_deleted')
    ) q),'[]'::jsonb),
    'subscriptions',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM (
      SELECT us.id,us.user_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,sp.name plan_name,sp.price_aud,
        us.status subscription_status,CASE WHEN us.status IN ('past_due','unpaid') THEN us.status ELSE 'recorded' END payment_status,
        us.started_at,us.expires_at,us.created_at,us.is_read_only,
        CASE WHEN lower(sp.name) LIKE '%vendor%' AND us.status='pending_approval' THEN 'pending' ELSE 'not_applicable' END vendor_approval_status
      FROM public.user_subscriptions us JOIN public.subscription_plans sp ON sp.id=us.plan_id LEFT JOIN public.profiles p ON p.id=us.user_id
    ) q),'[]'::jsonb),
    'events',coalesce((SELECT jsonb_agg(to_jsonb(er) ORDER BY er.created_at DESC) FROM event_reporting er),'[]'::jsonb),
    'lifecycle',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.deletion_requested_at DESC NULLS LAST) FROM (
      SELECT l.account_owner_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,l.status,l.deletion_requested_at,l.purge_after,l.reactivated_at,
        l.stripe_cancellation_succeeded,l.deletion_processing_error,l.updated_at,sp.name previous_plan,
        CASE WHEN l.status='scheduled_for_deletion' THEN 'scheduled' WHEN l.status='permanently_deleted' THEN 'completed' ELSE 'not_due' END purge_status
      FROM public.account_lifecycle l LEFT JOIN public.profiles p ON p.id=l.account_owner_id
      LEFT JOIN LATERAL (SELECT x.plan_id FROM public.user_subscriptions x WHERE x.user_id=l.account_owner_id ORDER BY x.updated_at DESC LIMIT 1) us ON true
      LEFT JOIN public.subscription_plans sp ON sp.id=us.plan_id
    ) q),'[]'::jsonb),
    'payments',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.payment_date DESC) FROM (
      SELECT ep.id,ep.user_id,concat_ws(' ',p.first_name,p.last_name) customer_name,p.email,'plan_purchase' payment_type,
        ep.amount_paid,ep.purchased_at payment_date,'succeeded' status,ep.stripe_payment_id stripe_reference,ep.payment_method
      FROM public.event_purchases ep LEFT JOIN public.profiles p ON p.id=ep.user_id
      UNION ALL
      SELECT rp.id,rp.user_id,concat_ws(' ',p.first_name,p.last_name),p.email,
        CASE WHEN rp.purchase_type='overage' THEN 'sms_top_up' ELSE 'rsvp_bundle' END,rp.amount_paid,rp.created_at,rp.status,
        coalesce(rp.stripe_payment_id,rp.stripe_session_id),NULL
      FROM public.rsvp_invite_purchases rp LEFT JOIN public.profiles p ON p.id=rp.user_id
    ) q),'[]'::jsonb),
    'recent_admin_actions',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC) FROM (
      SELECT id,administrator_id,action,target_type,target_id,result,created_at FROM public.admin_action_audit ORDER BY created_at DESC LIMIT 20
    ) q),'[]'::jsonb),
    'configuration',jsonb_build_object('account_lifecycle',to_regprocedure('public.get_account_closure_admin_summary()') IS NOT NULL,
      'admin_actions',true,'stripe_live_data',false,'platform_reporting',true)
  ) INTO payload;
  RETURN payload;
END; $$;

REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;

