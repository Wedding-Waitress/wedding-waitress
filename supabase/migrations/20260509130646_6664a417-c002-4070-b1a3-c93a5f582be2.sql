
-- 1) Extend get_public_event_with_data_secure with collect_guest_addresses + 5 mailing fields
DROP FUNCTION IF EXISTS public.get_public_event_with_data_secure(text, text);

CREATE OR REPLACE FUNCTION public.get_public_event_with_data_secure(event_slug text, access_token text DEFAULT NULL::text)
 RETURNS TABLE(
   event_id uuid, event_name text, event_date text, event_venue text, event_start_time text, event_finish_time text,
   partner1_name text, partner2_name text, ceremony_venue text, ceremony_start_time text, ceremony_finish_time text,
   guest_id uuid, guest_first_name text, guest_last_name text, guest_table_no integer, guest_table_id uuid,
   guest_seat_no integer, guest_rsvp text, guest_dietary text,
   show_rsvp_invite boolean, show_welcome_video boolean, rsvp_invite_config jsonb, welcome_video_config jsonb,
   show_floor_plan boolean, show_menu boolean, floor_plan_config jsonb, menu_config jsonb, hero_image_config jsonb,
   guest_added_by_guest_id uuid, show_reception_floor_plan boolean, reception_floor_plan_config jsonb,
   guest_family_group text, guest_allow_plus_one boolean, event_venue_address text, ceremony_venue_address text,
   kiosk_show_rsvp_status boolean, kiosk_show_dietary boolean, event_allow_guest_plus_ones boolean,
   event_collect_guest_addresses boolean,
   guest_mailing_address text, guest_mailing_suburb text, guest_mailing_state text, guest_mailing_postcode text,
   guest_address_received boolean
 )
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
    g.allow_plus_one,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.venue_address ELSE NULL END,
    CASE WHEN COALESCE(e.public_show_venue, true) THEN e.ceremony_venue_address ELSE NULL END,
    COALESCE(lvs.kiosk_show_rsvp_status, true),
    COALESCE(lvs.kiosk_show_dietary, true),
    COALESCE(e.allow_guest_plus_ones, false),
    COALESCE(e.collect_guest_addresses, false),
    g.mailing_address, g.mailing_suburb, g.mailing_state, g.mailing_postcode,
    COALESCE(g.address_received, false)
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

-- 2) Extend update_guest_rsvp_public to accept mailing fields and auto-set address_received
DROP FUNCTION IF EXISTS public.update_guest_rsvp_public(uuid, uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_guest_rsvp_public(
  _guest_id UUID,
  _event_id UUID,
  _rsvp TEXT DEFAULT NULL,
  _dietary TEXT DEFAULT NULL,
  _mobile TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _mailing_address TEXT DEFAULT NULL,
  _mailing_suburb TEXT DEFAULT NULL,
  _mailing_state TEXT DEFAULT NULL,
  _mailing_postcode TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_exists BOOLEAN;
  _collect_addresses BOOLEAN;
BEGIN
  -- Validate: event must exist and have QR live view enabled
  SELECT EXISTS(
    SELECT 1 FROM events
    WHERE id = _event_id
    AND qr_apply_to_live_view = true
  ) INTO _event_exists;

  IF NOT _event_exists THEN
    RETURN false;
  END IF;

  -- Validate: guest must belong to this event
  IF NOT EXISTS(
    SELECT 1 FROM guests
    WHERE id = _guest_id
    AND event_id = _event_id
  ) THEN
    RETURN false;
  END IF;

  -- Only allow address writes when event has the toggle on; otherwise ignore them
  SELECT COALESCE(collect_guest_addresses, false) INTO _collect_addresses
  FROM events WHERE id = _event_id;

  IF NOT _collect_addresses THEN
    _mailing_address := NULL;
    _mailing_suburb := NULL;
    _mailing_state := NULL;
    _mailing_postcode := NULL;
  END IF;

  -- Perform the update (only non-null values), and recompute address_received
  UPDATE guests SET
    rsvp = COALESCE(_rsvp, rsvp),
    dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile),
    email = COALESCE(_email, email),
    notes = COALESCE(_notes, notes),
    mailing_address = COALESCE(_mailing_address, mailing_address),
    mailing_suburb = COALESCE(_mailing_suburb, mailing_suburb),
    mailing_state = COALESCE(_mailing_state, mailing_state),
    mailing_postcode = COALESCE(_mailing_postcode, mailing_postcode),
    address_received = CASE
      WHEN _collect_addresses THEN (
        COALESCE(NULLIF(btrim(COALESCE(_mailing_address, mailing_address)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_suburb, mailing_suburb)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_state, mailing_state)), ''), '') <> ''
        OR COALESCE(NULLIF(btrim(COALESCE(_mailing_postcode, mailing_postcode)), ''), '') <> ''
      )
      ELSE address_received
    END,
    rsvp_date = CASE WHEN _rsvp IS NOT NULL THEN CURRENT_DATE ELSE rsvp_date END
  WHERE id = _guest_id AND event_id = _event_id;

  -- Log the change
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _guest_id, jsonb_build_object(
    'rsvp', _rsvp,
    'dietary', _dietary,
    'mobile', _mobile,
    'email', _email,
    'notes', _notes,
    'mailing_address', _mailing_address,
    'mailing_suburb', _mailing_suburb,
    'mailing_state', _mailing_state,
    'mailing_postcode', _mailing_postcode
  ), 'public_live_view');

  RETURN true;
END;
$$;
