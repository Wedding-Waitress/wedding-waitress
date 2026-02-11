
-- Recreate get_public_event_with_data_secure with new columns
CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(event_slug text, access_token text DEFAULT NULL::text)
 RETURNS TABLE(event_id uuid, event_name text, event_date text, event_venue text, event_start_time text, event_finish_time text, partner1_name text, partner2_name text, guest_id uuid, guest_first_name text, guest_last_name text, guest_table_no integer, guest_table_id uuid, guest_seat_no integer, guest_rsvp text, guest_dietary text, show_rsvp_invite boolean, show_welcome_video boolean, rsvp_invite_config jsonb, welcome_video_config jsonb, show_floor_plan boolean, show_menu boolean, floor_plan_config jsonb, menu_config jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    e.id, 
    e.name, 
    e.date::text, 
    e.venue, 
    e.start_time::text, 
    e.finish_time::text, 
    e.partner1_name, 
    e.partner2_name,
    g.id, 
    g.first_name, 
    g.last_name, 
    g.table_no, 
    g.table_id,
    g.seat_no, 
    g.rsvp, 
    g.dietary,
    COALESCE(lvs.show_rsvp_invite, false),
    COALESCE(lvs.show_welcome_video, false),
    lvms.rsvp_invite_config,
    lvms.welcome_video_config,
    COALESCE(lvs.show_floor_plan, false),
    COALESCE(lvs.show_menu, false),
    lvms.floor_plan_config,
    lvms.menu_config
  FROM events e 
  LEFT JOIN guests g ON e.id = g.event_id
  LEFT JOIN guest_access_tokens gat ON (g.id = gat.guest_id AND gat.access_token = access_token AND gat.expires_at > now())
  LEFT JOIN live_view_settings lvs ON lvs.event_id = e.id
  LEFT JOIN live_view_module_settings lvms ON lvms.event_id = e.id
  WHERE e.slug = event_slug 
    AND e.qr_apply_to_live_view = true 
    AND (access_token IS NULL OR gat.guest_id IS NOT NULL)
  ORDER BY g.first_name, g.last_name;
$function$;

-- Recreate get_public_live_view_settings with new columns
CREATE OR REPLACE FUNCTION public.get_public_live_view_settings(_event_slug text)
 RETURNS TABLE(show_rsvp_invite boolean, show_search boolean, show_ceremony boolean, show_reception boolean, show_update_details boolean, show_invite_video boolean, show_welcome_video boolean, show_floor_plan boolean, show_menu boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT lvs.show_rsvp_invite, lvs.show_search, lvs.show_ceremony, lvs.show_reception,
    lvs.show_update_details, lvs.show_invite_video, lvs.show_welcome_video,
    lvs.show_floor_plan, lvs.show_menu
  FROM public.live_view_settings lvs
  JOIN public.events e ON e.id = lvs.event_id
  WHERE e.slug = _event_slug AND e.qr_apply_to_live_view = true;
$function$;
