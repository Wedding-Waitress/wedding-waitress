
-- 1. Privacy toggle columns (defaults preserve current public output)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS public_show_venue BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_show_partner_names BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_show_date BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.events.public_show_venue IS
  'When false, get_public_event_with_data_secure returns NULL for venue/ceremony_venue. Owner-controlled privacy toggle for the public guest lookup page.';
COMMENT ON COLUMN public.events.public_show_partner_names IS
  'When false, get_public_event_with_data_secure returns NULL for partner1_name/partner2_name. Owner-controlled privacy toggle.';
COMMENT ON COLUMN public.events.public_show_date IS
  'When false, get_public_event_with_data_secure returns NULL for event date and ceremony date/times. Owner-controlled privacy toggle.';

-- 2. Update RPC to honor toggles. Signature unchanged.
CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(event_slug text, access_token text DEFAULT NULL::text)
 RETURNS TABLE(event_id uuid, event_name text, event_date text, event_venue text, event_start_time text, event_finish_time text, partner1_name text, partner2_name text, ceremony_venue text, ceremony_start_time text, ceremony_finish_time text, guest_id uuid, guest_first_name text, guest_last_name text, guest_table_no integer, guest_table_id uuid, guest_seat_no integer, guest_rsvp text, guest_dietary text, show_rsvp_invite boolean, show_welcome_video boolean, rsvp_invite_config jsonb, welcome_video_config jsonb, show_floor_plan boolean, show_menu boolean, floor_plan_config jsonb, menu_config jsonb, hero_image_config jsonb, guest_added_by_guest_id uuid, show_reception_floor_plan boolean, reception_floor_plan_config jsonb, guest_family_group text, guest_allow_plus_one boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    e.id,
    e.name,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.date::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.venue ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.start_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.finish_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_partner_names, true) THEN e.partner1_name ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_partner_names, true) THEN e.partner2_name ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.ceremony_venue ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.ceremony_start_time::text ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_date, true) THEN e.ceremony_finish_time::text ELSE NULL END,
    g.id, g.first_name, g.last_name, g.table_no, g.table_id, g.seat_no, g.rsvp, g.dietary,
    COALESCE(lvs.show_rsvp_invite, false),
    COALESCE(lvs.show_welcome_video, false),
    lvms.rsvp_invite_config, lvms.welcome_video_config,
    COALESCE(lvs.show_floor_plan, false),
    COALESCE(lvs.show_menu, false),
    lvms.floor_plan_config, lvms.menu_config, lvms.hero_image_config,
    g.added_by_guest_id,
    COALESCE(lvs.show_reception_floor_plan, false),
    lvms.reception_floor_plan_config,
    g.family_group,
    g.allow_plus_one
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
