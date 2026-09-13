-- Owner support preview: business records only; no impersonation or customer writes.
BEGIN;
-- Optional future synchronization source. Absence means unknown history, never defaults.
CREATE FUNCTION private.admin_individual_chart_style(p_owner uuid,p_event uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE snapshot jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT private.is_platform_owner(auth.uid()) OR NOT public.is_owner_admin() THEN
  RAISE EXCEPTION 'Verified owner administrator required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event AND user_id=p_owner) THEN
  RAISE EXCEPTION 'Owned event required' USING ERRCODE='42501'; END IF;
 IF to_regclass('public.individual_table_chart_settings') IS NULL THEN RETURN NULL; END IF;
 EXECUTE 'SELECT jsonb_build_object(''user_id'',user_id,''event_id'',event_id,''settings'',settings,''revision'',revision,''updated_at'',updated_at,''updated_by'',updated_by) FROM public.individual_table_chart_settings WHERE event_id=$1 AND user_id=$2'
 INTO snapshot USING p_event,p_owner;
 RETURN snapshot;
END $$;
REVOKE ALL ON FUNCTION private.admin_individual_chart_style(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.admin_place_card_fit(p_owner uuid,p_event uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE snapshot jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT private.is_platform_owner(auth.uid()) OR NOT public.is_owner_admin() THEN
  RAISE EXCEPTION 'Verified owner administrator required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=p_event AND user_id=p_owner) THEN
  RAISE EXCEPTION 'Owned event required' USING ERRCODE='42501'; END IF;
 IF to_regclass('public.place_card_image_fit_decisions') IS NULL THEN RETURN NULL; END IF;
 EXECUTE 'SELECT jsonb_build_object(''user_id'',user_id,''event_id'',event_id,''snapshot'',snapshot,''revision'',revision,''updated_at'',updated_at,''updated_by'',updated_by) FROM public.place_card_image_fit_decisions WHERE event_id=$1 AND user_id=$2'
 INTO snapshot USING p_event,p_owner;
 RETURN snapshot;
END $$;
REVOKE ALL ON FUNCTION private.admin_place_card_fit(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_get_customer_account_preview(p_target uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE customer jsonb; events jsonb; BEGIN
 IF auth.uid() IS NULL OR NOT private.is_platform_owner(auth.uid()) OR NOT public.is_owner_admin() THEN
  RAISE EXCEPTION 'Verified owner administrator required' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object('account_id',p.account_id,'name',concat_ws(' ',p.first_name,p.last_name),
  'email',p.email,'mobile',p.mobile,'country_code',p.country_code,'user_id',p.id,
  'login_email',u.email,'pending_email',nullif(to_jsonb(u)->>'email_change',''),
  'display_countdown_event_id',to_jsonb(p)->'display_countdown_event_id',
  'email_confirmed_at',u.email_confirmed_at,'member_since',to_jsonb(u)->'created_at',
  'profile_artwork',jsonb_build_object('user_id',p.id,'first_name',p.first_name,'last_name',p.last_name,
   'image_path',to_jsonb(p)->'profile_image_path','fit',to_jsonb(p)->'profile_image_fit',
   'position_x',to_jsonb(p)->'profile_image_position_x','position_y',to_jsonb(p)->'profile_image_position_y'),
  'account_role',(SELECT m.role FROM public.account_members m WHERE m.account_owner_id=p_target AND m.member_user_id=p_target
   AND m.accepted_at IS NOT NULL ORDER BY (m.role='master') DESC,m.id LIMIT 1),
  'marketing_preference',(SELECT jsonb_build_object('status',mp.status,'consent_email',mp.consent_email)
   FROM public.marketing_preferences mp WHERE mp.user_id=p_target)) INTO customer
 FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE p.id=p_target;
 IF customer IS NULL THEN RAISE EXCEPTION 'Customer not found' USING ERRCODE='P0002'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'date',e.date,'slug',e.slug,
  'saved_event',jsonb_build_object('id',e.id,'user_id',e.user_id,'name',e.name,'date',e.date,
   'event_id',to_jsonb(e)->'event_id','created_at',e.created_at,'event_created',to_jsonb(e)->'event_created',
   'expiry_date',to_jsonb(e)->'expiry_date','created_date_local',to_jsonb(e)->'created_date_local','expiry_date_local',to_jsonb(e)->'expiry_date_local',
   'event_image_path',to_jsonb(e)->'event_image_path','event_image_fit',to_jsonb(e)->'event_image_fit',
   'event_image_position_x',to_jsonb(e)->'event_image_position_x','event_image_position_y',to_jsonb(e)->'event_image_position_y','event_image_zoom',to_jsonb(e)->'event_image_zoom',
   'venue',e.venue,'venue_address',e.venue_address,'venue_phone',to_jsonb(e)->'venue_phone','venue_contact',to_jsonb(e)->'venue_contact','venue_contact_email',to_jsonb(e)->'venue_contact_email',
   'start_time',e.start_time,'finish_time',e.finish_time,'rsvp_deadline',e.rsvp_deadline,'guest_limit',e.guest_limit,
   'partner1_name',e.partner1_name,'partner2_name',e.partner2_name,'ceremony_name',to_jsonb(e)->'ceremony_name',
   'ceremony_enabled',e.ceremony_enabled,'ceremony_date',e.ceremony_date,'ceremony_venue',e.ceremony_venue,'ceremony_venue_address',e.ceremony_venue_address,
   'ceremony_venue_phone',to_jsonb(e)->'ceremony_venue_phone','ceremony_venue_contact',to_jsonb(e)->'ceremony_venue_contact','ceremony_venue_contact_email',to_jsonb(e)->'ceremony_venue_contact_email',
   'ceremony_start_time',e.ceremony_start_time,'ceremony_finish_time',e.ceremony_finish_time,'ceremony_guest_limit',to_jsonb(e)->'ceremony_guest_limit','ceremony_rsvp_deadline',to_jsonb(e)->'ceremony_rsvp_deadline',
   'reception_enabled',e.reception_enabled,'event_timezone',to_jsonb(e)->'event_timezone','event_type',to_jsonb(e)->'event_type','relation_mode',to_jsonb(e)->'relation_mode','allow_guest_plus_ones',to_jsonb(e)->'allow_guest_plus_ones','collect_guest_addresses',to_jsonb(e)->'collect_guest_addresses'),
  'guest_notification_preferences',(SELECT jsonb_build_object('event_id',p.event_id,'user_id',e.user_id,'email_enabled',p.email_enabled,'sms_enabled',to_jsonb(p)->'sms_enabled') FROM public.guest_addition_notification_preferences p WHERE p.event_id=e.id),
  'guest_notifications',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',n.id,'event_id',n.event_id,'user_id',e.user_id,'guest_id',n.guest_id,
   'added_by_guest_id',n.added_by_guest_id,'group_choice',n.group_choice,'added_guest_name',n.added_guest_name,'added_by_name',n.added_by_name,
   'created_at',n.created_at,'reviewed_at',n.reviewed_at,'email_status',n.email_status,'sms_status',to_jsonb(n)->'sms_status') ORDER BY n.created_at DESC,n.id),'[]')
   FROM public.guest_addition_notifications n JOIN public.guests guest ON guest.id=n.guest_id AND guest.event_id=n.event_id AND guest.user_id=p_target WHERE n.event_id=e.id),
  'guest_delivery_history',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'user_id',l.user_id,'event_id',l.event_id,'guest_id',l.guest_id,
   'channel',l.delivery_method,'status',l.status,'created_at',l.created_at,'delivered_at',l.delivered_at,'failed_at',l.failed_at,'last_status_at',l.last_status_at,'to_masked',l.to_masked) ORDER BY l.created_at DESC,l.id),'[]')
   FROM public.sms_send_logs l WHERE l.event_id=e.id AND l.user_id=p_target AND (l.guest_id IS NULL OR EXISTS(SELECT 1 FROM public.guests owned WHERE owned.id=l.guest_id AND owned.event_id=e.id AND owned.user_id=p_target))),
  'event_email_history',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'user_id',l.customer_id,'event_id',l.event_id,
   'template_name',l.template_name,'status',l.status,'created_at',l.created_at,'recipient_email',l.recipient_email) ORDER BY l.created_at DESC,l.id),'[]')
   FROM public.email_send_log l WHERE l.event_id=e.id AND l.customer_id=p_target AND l.purpose='transactional'),
  'document_event',jsonb_build_object('name',e.name,'date',e.date,'venue',e.venue,
   'start_time',e.start_time,'finish_time',e.finish_time,
   'partner1_name',e.partner1_name,'partner2_name',e.partner2_name,
   'ceremony_date',e.ceremony_date,'ceremony_venue',e.ceremony_venue,
   'ceremony_start_time',e.ceremony_start_time,'ceremony_finish_time',e.ceremony_finish_time,
   'rsvp_deadline',e.rsvp_deadline,'ceremony_enabled',e.ceremony_enabled,'ceremony_venue_address',e.ceremony_venue_address,
   'reception_enabled',e.reception_enabled,'venue_address',e.venue_address),
  'individual_chart_settings',private.admin_individual_chart_style(p_target,e.id),
  'live_view_visibility',(SELECT jsonb_build_object('id',v.id,'user_id',e.user_id,'event_id',v.event_id,
   'show_rsvp_invite',v.show_rsvp_invite,'show_update_details',v.show_update_details,'show_search',v.show_search,
   'show_ceremony',v.show_ceremony,'show_reception',v.show_reception,'show_invite_video',v.show_invite_video,
   'show_welcome_video',v.show_welcome_video,'show_floor_plan',v.show_floor_plan,'show_menu',v.show_menu,
   'show_reception_floor_plan',to_jsonb(v)->'show_reception_floor_plan',
   'kiosk_show_rsvp_status',to_jsonb(v)->'kiosk_show_rsvp_status','kiosk_show_dietary',to_jsonb(v)->'kiosk_show_dietary')
   FROM public.live_view_settings v WHERE v.event_id=e.id),
  'live_view_configuration',(SELECT jsonb_build_object('id',m.id,'user_id',e.user_id,'event_id',m.event_id)||
   (SELECT jsonb_object_agg(key,jsonb_build_object('source',value->'source','file_url',value->'file_url',
    'video_url',value->'video_url','file_name',value->'file_name','file_type',value->'file_type','uploaded_at',value->'uploaded_at'))
    FROM jsonb_each(to_jsonb(m)) WHERE key IN ('rsvp_invite_config','welcome_video_config','reception_floor_plan_config','menu_config','hero_image_config'))
   FROM public.live_view_module_settings m WHERE m.event_id=e.id),
  'place_card_fit',private.admin_place_card_fit(p_target,e.id),
  'qr_settings',(SELECT jsonb_build_object('id',q.id,'user_id',q.user_id,'event_id',q.event_id,'background_color',q.background_color,
   'foreground_color',q.foreground_color,'dots_color',q.dots_color,'marker_border_color',q.marker_border_color,'marker_center_color',q.marker_center_color,
   'dots_shape',q.dots_shape,'marker_border_shape',q.marker_border_shape,'marker_center_shape',q.marker_center_shape,
   'center_image_url',q.center_image_url,'center_image_size',q.center_image_size) FROM public.qr_code_settings q WHERE q.event_id=e.id AND q.user_id=p_target),
  'dynamic_qr_record',(SELECT jsonb_build_object('user_id',q.user_id,'current_event_id',q.current_event_id,'code',q.code,
   'is_active',q.is_active,'destination_type',q.destination_type) FROM public.dynamic_qr_codes q WHERE q.current_event_id=e.id AND q.user_id=p_target AND q.is_active
   AND (SELECT count(*) FROM public.dynamic_qr_codes active WHERE active.current_event_id=e.id AND active.user_id=p_target AND active.is_active)=1
   ORDER BY q.created_at,q.id LIMIT 1),
  'guestbook_messages',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'event_id',m.event_id,'gallery_id',m.gallery_id,
   'uploader_name',m.uploader_name,'message',m.message,'moderation_status',m.moderation_status,'created_at',m.created_at,'guestbook_seq',m.guestbook_seq)
   ORDER BY m.created_at DESC,m.id),'[]') FROM public.event_guestbook_messages m
   JOIN public.event_media_galleries g ON g.id=m.gallery_id AND g.event_id=m.event_id WHERE m.event_id=e.id AND g.user_id=p_target),
  'media_gallery',(SELECT jsonb_build_object('id',g.id,'event_id',g.event_id,'user_id',g.user_id,
   'is_open',g.is_open,'gallery_title',g.gallery_title,'welcome_message',g.welcome_message,'show_event_date',g.show_event_date,
   'theme_color',g.theme_color,'background_style',g.background_style,'background_mode',g.background_mode,'background_color',g.background_color,'background_image_url',g.background_image_url,'cover_image_url',g.cover_image_url,'logo_image_url',g.logo_image_url,
   'guest_upload_enabled',g.guest_upload_enabled,'gallery_view_enabled',g.gallery_view_enabled,'guestbook_text_enabled',g.guestbook_text_enabled,
   'video_guestbook_enabled',g.video_guestbook_enabled,'photo_booth_enabled',g.photo_booth_enabled,
   'photo_booth_mode',g.photo_booth_mode,'show_branding',g.show_branding,
   'photo_booth_strip_bottom_text',g.photo_booth_strip_bottom_text,'photo_booth_strip_logo_url',g.photo_booth_strip_logo_url,
   'photo_booth_strip_template_url',g.photo_booth_strip_template_url,'photo_booth_strip_style',g.photo_booth_strip_style,'slideshow_enabled',g.slideshow_enabled,
   'slideshow_include_photos',g.slideshow_include_photos,'slideshow_include_videos',g.slideshow_include_videos,
   'slideshow_albums',g.slideshow_albums,'slideshow_order',g.slideshow_order,'slideshow_slide_duration_sec',g.slideshow_slide_duration_sec,
   'slideshow_transition',g.slideshow_transition,'slideshow_show_caption',g.slideshow_show_caption,'slideshow_loop',g.slideshow_loop)
   FROM public.event_media_galleries g WHERE g.event_id=e.id AND g.user_id=p_target),
  'media_items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'user_id',g.user_id,'event_id',i.event_id,'gallery_id',i.gallery_id,'kind',i.kind,'mime_type',i.mime_type,'byte_size',i.byte_size,
   'duration_sec',i.duration_sec,'storage_path',i.storage_path,'uploader_name',i.uploader_name,'caption',i.caption,
   'guestbook_message',i.guestbook_message,'uploaded_at',i.uploaded_at,'moderation_status',i.moderation_status,'album',i.album,
   'is_guestbook',i.is_guestbook,'is_photo_booth',i.is_photo_booth,'is_photo_booth_strip',i.is_photo_booth_strip,
   'source_category',i.source_category,'like_count',i.like_count,'shared_to_gallery',i.shared_to_gallery,
   'share_photo_seq',i.share_photo_seq,'share_video_seq',i.share_video_seq,'guestbook_recording_seq',i.guestbook_recording_seq,'photo_booth_seq',i.photo_booth_seq)
   ORDER BY i.uploaded_at DESC NULLS LAST,i.id),'[]') FROM public.event_media_items i
   JOIN public.event_media_galleries g ON g.id=i.gallery_id AND g.event_id=i.event_id
   WHERE i.event_id=e.id AND g.user_id=p_target AND i.upload_status='uploaded'),
  'signage_settings',(SELECT jsonb_build_object('id',s.id,'user_id',s.user_id,'event_id',s.event_id,
   'orientation',s.orientation,'background_color',s.background_color,'background_image_url',s.background_image_url,
   'background_image_print_url',to_jsonb(s)->'background_image_print_url','background_image_type',s.background_image_type,
   'background_image_x_position',s.background_image_x_position,'background_image_y_position',s.background_image_y_position,
   'background_image_opacity',s.background_image_opacity,'text_zones',s.text_zones,'qr_config',s.qr_config,'notes',s.notes)
   FROM public.signage_settings s WHERE s.event_id=e.id AND s.user_id=p_target),
  'place_card_settings',(SELECT jsonb_build_object('id',p.id,'user_id',p.user_id,'event_id',p.event_id,
   'font_family',p.font_family,'font_color',p.font_color,'background_color',p.background_color,
   'background_image_url',p.background_image_url,'background_image_type',p.background_image_type,
   'background_image_x_position',p.background_image_x_position,'background_image_y_position',p.background_image_y_position,
   'background_image_scale',p.background_image_scale,'background_image_opacity',p.background_image_opacity,
   'front_image_url',p.front_image_url,'back_image_url',p.back_image_url,'mass_message',p.mass_message,
   'individual_messages',p.individual_messages,'guest_font_family',p.guest_font_family,'info_font_family',p.info_font_family,
   'guest_name_bold',p.guest_name_bold,'guest_name_italic',p.guest_name_italic,'guest_name_underline',p.guest_name_underline,
   'guest_name_font_size',p.guest_name_font_size,'info_font_size',p.info_font_size,'name_spacing',p.name_spacing,
   'background_behind_names',to_jsonb(p)->'background_behind_names','background_behind_table_seats',to_jsonb(p)->'background_behind_table_seats',
   'guest_name_offset_x',to_jsonb(p)->'guest_name_offset_x','guest_name_offset_y',to_jsonb(p)->'guest_name_offset_y',
   'table_offset_x',to_jsonb(p)->'table_offset_x','table_offset_y',to_jsonb(p)->'table_offset_y',
   'seat_offset_x',to_jsonb(p)->'seat_offset_x','seat_offset_y',to_jsonb(p)->'seat_offset_y',
   'guest_name_rotation',to_jsonb(p)->'guest_name_rotation','table_seat_rotation',to_jsonb(p)->'table_seat_rotation',
   'info_bold',p.info_bold,'info_italic',p.info_italic,'info_underline',p.info_underline,'info_font_color',p.info_font_color,
   'photo_video_qr_enabled',to_jsonb(p)->'photo_video_qr_enabled','photo_video_qr_x',to_jsonb(p)->'photo_video_qr_x',
   'photo_video_qr_y',to_jsonb(p)->'photo_video_qr_y','photo_video_qr_size',to_jsonb(p)->'photo_video_qr_size')
   FROM public.place_card_settings p WHERE p.event_id=e.id AND p.user_id=p_target),
  'dietary_settings',(SELECT jsonb_build_object('user_id',s.user_id,'event_id',s.event_id,
   'sort_by',s.sort_by,'font_size',s.font_size,'guest_name_color',s.guest_name_color,'guest_list_color',s.guest_list_color,
   'dietary_color',s.dietary_color,'relationship_color',s.relationship_color,'seat_number_color',s.seat_number_color,
   'show_guest_names',s.show_guest_names,'show_guest_list',s.show_guest_list,'show_dietary',s.show_dietary,
   'show_relation',s.show_relation,'show_seat_numbers',to_jsonb(s)->'show_seat_numbers','show_seat_no',to_jsonb(s)->'show_seat_no',
   'show_logo',s.show_logo,'paper_size',s.paper_size,'is_bold',s.is_bold,'is_italic',s.is_italic,'is_underline',s.is_underline)
   FROM public.dietary_chart_settings s WHERE s.event_id=e.id AND s.user_id=p_target),
  'full_seating_settings',(SELECT jsonb_build_object('user_id',f.user_id,'event_id',f.event_id,
   'sort_by',f.sort_by,'font_size',f.font_size,'show_dietary',f.show_dietary,'show_rsvp',f.show_rsvp,'show_relation',f.show_relation,
   'paper_size',f.paper_size,'show_guest_names',f.show_guest_names,'show_seat_numbers',f.show_seat_numbers,'show_guest_list',f.show_guest_list,
   'guest_name_color',f.guest_name_color,'seat_number_color',f.seat_number_color,'guest_list_color',f.guest_list_color,
   'dietary_color',f.dietary_color,'relationship_color',f.relationship_color,'show_logo',f.show_logo,
   'is_bold',f.is_bold,'is_italic',f.is_italic,'is_underline',f.is_underline)
   FROM public.full_seating_chart_settings f WHERE f.event_id=e.id AND f.user_id=p_target),
  'invitation_artworks',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',a.id,'event_id',a.event_id,'user_id',a.user_id,'name',a.name,'card_type',a.card_type,
   'card_size',a.card_size,'orientation',a.orientation,'background_color',a.background_color,
   'background_image_url',a.background_image_url,'background_image_type',a.background_image_type,
   'background_image_x_position',a.background_image_x_position,'background_image_y_position',a.background_image_y_position,
   'background_image_opacity',a.background_image_opacity,'text_zones',a.text_zones,'font_color',a.font_color,
   'qr_config',a.qr_config,'notes',a.notes,'created_at',a.created_at,'updated_at',a.updated_at)
   ORDER BY a.created_at,a.id),'[]') FROM public.invitation_card_settings a WHERE a.event_id=e.id AND a.user_id=p_target),
  'budget',jsonb_build_object('settings',(SELECT jsonb_build_object('id',s.id,'event_id',s.event_id,'user_id',s.user_id,
   'anticipated_budget',s.anticipated_budget,'currency',s.currency,'planned_budget_kind',s.planned_budget_kind,
   'planned_budget_range',s.planned_budget_range,'created_at',s.created_at,'updated_at',s.updated_at)
   FROM public.event_budget_settings s WHERE s.event_id=e.id AND s.user_id=p_target),
   'expenses',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'event_id',x.event_id,'user_id',x.user_id,
    'category',x.category,'custom_category',x.custom_category,'expense_name',x.expense_name,'vendor_name',x.vendor_name,
    'contact_person',x.contact_person,'phone',x.phone,'email',x.email,'address',x.address,
    'estimated_cost',x.estimated_cost,'actual_cost',x.actual_cost,'amount_paid',x.amount_paid,
    'payment_date',x.payment_date,'balance_due_date',x.balance_due_date,'notes',x.notes,'display_order',x.display_order,
    'created_at',x.created_at,'updated_at',x.updated_at) ORDER BY x.display_order,x.created_at),'[]')
    FROM public.event_budget_expenses x WHERE x.event_id=e.id AND x.user_id=p_target)),
  'ceremony_plan',(SELECT jsonb_build_object('id',c.id,'event_id',c.event_id,'user_id',c.user_id,
   'chairs_per_row',c.chairs_per_row,'total_rows',c.total_rows,'assigned_rows',c.assigned_rows,
   'left_side_label',c.left_side_label,'right_side_label',c.right_side_label,'altar_label',c.altar_label,
   'seat_assignments',c.seat_assignments,'show_row_numbers',c.show_row_numbers,'show_seat_numbers',c.show_seat_numbers,
   'bridal_party_left',coalesce(c.bridal_party_left,'[]'),'bridal_party_right',coalesce(c.bridal_party_right,'[]'),
   'bridal_party_count_left',coalesce(c.bridal_party_count_left,0),'bridal_party_count_right',coalesce(c.bridal_party_count_right,0),
   'bridal_party_roles_left',coalesce(c.bridal_party_roles_left,'[]'),'bridal_party_roles_right',coalesce(c.bridal_party_roles_right,'[]'),
   'couple_side_arrangement',c.couple_side_arrangement,'person_left_name',c.person_left_name,'person_right_name',c.person_right_name,
   'created_at',c.created_at,'updated_at',c.updated_at)
   FROM public.ceremony_floor_plans c WHERE c.event_id=e.id AND c.user_id=p_target),
  'reception_plan',(SELECT row_to_json(source)::jsonb FROM (
   SELECT p.id,p.event_id,p.user_id,p.room_shape,p.room_width_m,p.room_length_m,p.grid_size_cm,
    p.table_positions,p.fixtures,p.background_image_url,p.background_x,p.background_y,p.background_width,
    p.background_height,p.background_rotation,p.background_opacity,p.background_locked,p.background_visible,
    p.room_polygon,p.approval_status,p.vendor_notes,p.last_saved_at,p.share_enabled,p.created_at,p.updated_at,
    p.pan_x,p.pan_y,p.zoom,coalesce((to_jsonb(p)->>'manual_placement')::boolean,false) AS manual_placement
   FROM public.reception_floor_plans p WHERE p.event_id=e.id AND p.user_id=p_target
   ) source),
  'run_sheet',(SELECT jsonb_build_object('id',s.id,'label',s.section_label,'notes',s.section_notes,
   'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'sheet_id',i.sheet_id,
    'order_index',i.order_index,'time_text',i.time_text,'description_rich',i.description_rich,
    'responsible',i.responsible,'is_section_header',i.is_section_header,'is_bold',i.is_bold,
    'is_italic',i.is_italic,'is_underline',i.is_underline,'created_at',i.created_at,'updated_at',i.updated_at)
    ORDER BY i.order_index,i.id),'[]') FROM public.running_sheet_items i WHERE i.sheet_id=s.id))
   FROM public.running_sheets s WHERE s.event_id=e.id AND s.user_id=p_target),
  'questionnaire',(SELECT jsonb_build_object('id',q.id,'event_id',q.event_id,'user_id',q.user_id,
   'created_at',q.created_at,'updated_at',q.updated_at,
   'sections',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'questionnaire_id',s.questionnaire_id,
    'section_type',s.section_type,'section_label',s.section_label,'custom_columns',to_jsonb(s)->'custom_columns',
    'order_index',s.order_index,'notes',s.notes,'is_collapsed',s.is_collapsed,'created_at',s.created_at,'updated_at',s.updated_at,
    'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'section_id',i.section_id,
     'row_label',i.row_label,'value_text',i.value_text,'song_title_artist',i.song_title_artist,
     'music_url',i.music_url,'pronunciation_audio_url',i.pronunciation_audio_url,
     'pronunciation_audio_path',to_jsonb(i)->'pronunciation_audio_path','custom_values',to_jsonb(i)->'custom_values',
     'duration',i.duration,'order_index',i.order_index,'is_default',i.is_default,'is_bold',i.is_bold,
     'is_italic',i.is_italic,'is_underline',i.is_underline,'is_section_header',i.is_section_header,
     'created_at',i.created_at,'updated_at',i.updated_at) ORDER BY i.order_index,i.id),'[]')
     FROM public.dj_mc_items i WHERE i.section_id=s.id)) ORDER BY s.order_index,s.id),'[]')
    FROM public.dj_mc_sections s WHERE s.questionnaire_id=q.id))
   FROM public.dj_mc_questionnaires q WHERE q.event_id=e.id AND q.user_id=p_target),
  'guest_song_requests',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.id,'event_id',r.event_id,
   'guest_id',r.guest_id,'guest_name',r.guest_name,'slot_index',r.slot_index,'song_title',r.song_title,
   'artist_name',r.artist_name,'music_link',r.music_link,'note',r.note,'status',r.status,
   'created_at',r.created_at,'updated_at',r.updated_at) ORDER BY r.created_at DESC,r.id),'[]')
   FROM public.guest_song_requests r WHERE r.event_id=e.id),
  'guest_song_settings',(SELECT jsonb_build_object('id',s.id,'event_id',s.event_id,
   'enabled',s.enabled,'max_requests_per_guest',s.max_requests_per_guest)
   FROM public.guest_song_request_settings s WHERE s.event_id=e.id),
  'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'user_id',t.user_id,'event_id',t.event_id,
   'created_at',t.created_at,'updated_at',t.updated_at,'guest_count',(SELECT count(*) FROM public.guests seated WHERE seated.table_id=t.id AND seated.event_id=e.id AND seated.user_id=p_target),
   'name',t.name,'table_no',t.table_no,'capacity',t.limit_seats,'type',t.table_type,'limit_seats',t.limit_seats,'table_type',t.table_type,'notes',t.notes,'table_purpose',t.table_purpose,'head_seating_order',t.head_seating_order)),'[]') FROM public.tables t WHERE t.event_id=e.id AND t.user_id=p_target),
  'guests',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',concat_ws(' ',g.first_name,g.last_name),
   'user_id',g.user_id,'event_id',g.event_id,'created_at',g.created_at,'first_name',g.first_name,'last_name',g.last_name,'relation_display',g.relation_display,'display_order',g.display_order,
   'email',g.email,'notes',g.notes,'family_group',to_jsonb(g)->'family_group','allow_plus_one',to_jsonb(g)->'allow_plus_one',
   'added_by_guest_id',to_jsonb(g)->'added_by_guest_id','rsvp_invite_status',to_jsonb(g)->'rsvp_invite_status',
   'mobile',g.mobile,'relation_partner',g.relation_partner,'relation_role',g.relation_role,'assigned',g.assigned,
   'address_received',g.address_received,'mailing_address',g.mailing_address,'mailing_suburb',g.mailing_suburb,'mailing_state',g.mailing_state,'mailing_postcode',g.mailing_postcode,
   'table_id',g.table_id,'rsvp',g.rsvp,'dietary',g.dietary,'table_no',g.table_no,'seat_no',g.seat_no) ORDER BY g.first_name,g.last_name),'[]')
   FROM public.guests g WHERE g.event_id=e.id AND g.user_id=p_target)) ORDER BY e.created_at),'[]') INTO events
 FROM public.events e WHERE e.user_id=p_target;
 INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
 VALUES(auth.uid(),'view_customer_account','account',p_target::text,'Read-only owner support preview','{}',jsonb_build_object('read_only',true),'succeeded');
 RETURN jsonb_build_object('customer',customer,'events',events,'read_only',true,
  'recorded_subscription',(SELECT jsonb_build_object('user_id',s.user_id,'plan_name',p.name,'status',s.status,
   'started_at',s.started_at,'expires_at',s.expires_at,'download_only_ends_at',s.download_only_ends_at,
   'is_read_only',s.is_read_only,'guest_limit',p.guest_limit,'included_events',p.included_events)
   FROM public.user_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.user_id=p_target),
  'support_tickets',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'customer_id',t.customer_id,'event_id',t.event_id,
   'full_name',t.full_name,'contact_email',t.contact_email,'category',t.category,'message',t.message,'source',t.source,
   'status',t.status,'created_at',t.created_at,'updated_at',t.updated_at) ORDER BY t.created_at DESC,t.id),'[]')
   FROM public.support_tickets t WHERE t.customer_id=p_target));
END $$;
REVOKE ALL ON FUNCTION public.admin_get_customer_account_preview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_get_customer_account_preview(uuid) TO authenticated;
CREATE FUNCTION public.admin_get_customer_team_roster(p_target uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private,auth AS $$
DECLARE entries jsonb; active_count integer; recorded_count integer; pending_count integer;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_platform_owner(auth.uid()) OR NOT public.is_owner_admin() THEN
  RAISE EXCEPTION 'Verified owner administrator required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_target) THEN RAISE EXCEPTION 'Customer not found' USING ERRCODE='P0002'; END IF;
 WITH members AS (
  SELECT m.id,'member'::text kind,
   coalesce(nullif(concat_ws(' ',to_jsonb(m)->>'first_name',to_jsonb(m)->>'last_name'),''),nullif(concat_ws(' ',p.first_name,p.last_name),''),'') name,
   coalesce(nullif(to_jsonb(m)->>'member_email',''),u.email,p.email) email,m.role,
   CASE WHEN m.access_disabled_at IS NOT NULL THEN 'Access disabled' WHEN m.accepted_at IS NULL THEN 'Pending membership' ELSE 'Accepted' END status,
   (m.member_user_id=p_target AND m.role='master') is_owner
  FROM public.account_members m LEFT JOIN public.profiles p ON p.id=m.member_user_id
  LEFT JOIN auth.users u ON u.id=m.member_user_id WHERE m.account_owner_id=p_target
 ), invitations AS (
  SELECT i.id,'invitation'::text kind,concat_ws(' ',to_jsonb(i)->>'first_name',to_jsonb(i)->>'last_name') name,i.email,i.role,
   CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END status,false is_owner
  FROM public.account_invitations i WHERE i.account_owner_id=p_target
  AND NOT (i.status IN ('accepted','pending') AND EXISTS(
   SELECT 1 FROM public.account_members m LEFT JOIN auth.users u ON u.id=m.member_user_id
   WHERE m.account_owner_id=p_target AND m.accepted_at IS NOT NULL
   AND (i.status='accepted' OR m.access_disabled_at IS NULL)
   AND (m.member_user_id=i.accepted_user_id OR lower(coalesce(to_jsonb(m)->>'member_email',u.email,''))=lower(i.email))
  ))
 ), records AS (SELECT * FROM members UNION ALL SELECT * FROM invitations)
 SELECT coalesce(jsonb_agg(to_jsonb(records) ORDER BY is_owner DESC,kind,id),'[]'),
  count(*) FILTER(WHERE kind='member' AND status='Accepted'),count(*) FILTER(WHERE kind='member'),
  count(*) FILTER(WHERE kind='invitation' AND status='pending') INTO entries,active_count,recorded_count,pending_count FROM records;
 INSERT INTO public.admin_action_audit(administrator_id,action,target_type,target_id,reason,previous_state,new_state,result)
 VALUES(auth.uid(),'view_customer_team_members','account',p_target::text,'Read-only owner team roster review','{}','{"read_only":true}','succeeded');
 -- Existing owner + four additional seat limit; this RPC does not change it.
 RETURN jsonb_build_object('entries',entries,'active_members',active_count,'recorded_members',recorded_count,
  'pending_invitations',pending_count,'maximum_seats',5);
END $$;
REVOKE ALL ON FUNCTION public.admin_get_customer_team_roster(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_get_customer_team_roster(uuid) TO authenticated;
ALTER FUNCTION public.get_admin_platform_snapshot() RENAME TO get_admin_platform_snapshot_activity;
ALTER FUNCTION public.get_admin_platform_snapshot_activity() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.get_admin_platform_snapshot_activity() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.get_admin_platform_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,private AS $$ BEGIN
 IF NOT private.is_platform_owner(auth.uid()) OR NOT public.is_owner_admin() THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 RETURN private.get_admin_platform_snapshot_activity()||jsonb_build_object('admin_customer_preview_ready',true,'admin_team_roster_ready',true);
END $$;
REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
