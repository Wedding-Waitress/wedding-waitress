-- Preserve the invitation recipient/household token filter and public seating data.
-- Qualify function arguments to avoid comparing a token column to itself.
CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(event_slug text, access_token text DEFAULT NULL::text)
 RETURNS TABLE(event_id uuid, event_name text, event_date text, event_venue text, event_start_time text, event_finish_time text, partner1_name text, partner2_name text, ceremony_venue text, ceremony_start_time text, ceremony_finish_time text, guest_id uuid, guest_first_name text, guest_last_name text, guest_table_no integer, guest_table_id uuid, guest_seat_no integer, guest_rsvp text, guest_dietary text, show_rsvp_invite boolean, show_welcome_video boolean, rsvp_invite_config jsonb, welcome_video_config jsonb, show_floor_plan boolean, show_menu boolean, floor_plan_config jsonb, menu_config jsonb, hero_image_config jsonb, guest_added_by_guest_id uuid, show_reception_floor_plan boolean, reception_floor_plan_config jsonb, guest_family_group text, guest_allow_plus_one boolean, event_venue_address text, ceremony_venue_address text, kiosk_show_rsvp_status boolean, kiosk_show_dietary boolean, event_allow_guest_plus_ones boolean, event_collect_guest_addresses boolean, guest_mailing_address text, guest_mailing_suburb text, guest_mailing_state text, guest_mailing_postcode text, guest_address_received boolean)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH recipient AS (
    SELECT gat.event_id, gat.guest_id, rg.family_group
    FROM public.guest_access_tokens gat
    JOIN public.guests rg ON rg.id = gat.guest_id AND rg.event_id = gat.event_id
    WHERE gat.access_token = get_public_event_with_data_secure.access_token AND gat.expires_at > now()
  )
  SELECT
    e.id, e.name,
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
    COALESCE(lvs.show_rsvp_invite, false), COALESCE(lvs.show_welcome_video, false),
    lvms.rsvp_invite_config, lvms.welcome_video_config, COALESCE(lvs.show_floor_plan, false),
    COALESCE(lvs.show_menu, false), lvms.floor_plan_config, lvms.menu_config, lvms.hero_image_config,
    g.added_by_guest_id, COALESCE(lvs.show_reception_floor_plan, false), lvms.reception_floor_plan_config,
    g.family_group, g.allow_plus_one,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.venue_address ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.ceremony_venue_address ELSE NULL END,
    COALESCE(lvs.kiosk_show_rsvp_status, true), COALESCE(lvs.kiosk_show_dietary, true),
    COALESCE(e.allow_guest_plus_ones, false), COALESCE(e.collect_guest_addresses, false),
    -- Postal addresses are private invitation data, never public QR seating data.
    CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN g.mailing_address ELSE NULL END,
    CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN g.mailing_suburb ELSE NULL END,
    CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN g.mailing_state ELSE NULL END,
    CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN g.mailing_postcode ELSE NULL END,
    CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN COALESCE(g.address_received, false) ELSE false END
  FROM public.events e
  LEFT JOIN public.guests g ON g.event_id = e.id
  LEFT JOIN public.live_view_settings lvs ON lvs.event_id = e.id
  LEFT JOIN public.live_view_module_settings lvms ON lvms.event_id = e.id
  WHERE e.slug = get_public_event_with_data_secure.event_slug
    AND e.qr_apply_to_live_view = true
    AND (
      get_public_event_with_data_secure.access_token IS NULL
      OR EXISTS (
        SELECT 1 FROM recipient r
        WHERE r.event_id = e.id
          AND (g.id = r.guest_id OR (r.family_group IS NOT NULL AND g.family_group = r.family_group))
      )
    )
  ORDER BY g.first_name, g.last_name;
$function$
;
