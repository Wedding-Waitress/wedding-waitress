-- Recipient links use the existing 256-bit guest_access_tokens store.  This
-- migration adds no guest/event data and keeps event-wide QR links read-only.

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
  event_collect_guest_addresses boolean, guest_mailing_address text, guest_mailing_suburb text,
  guest_mailing_state text, guest_mailing_postcode text, guest_address_received boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path TO public AS $$
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
    g.mailing_address, g.mailing_suburb, g.mailing_state, g.mailing_postcode, COALESCE(g.address_received, false)
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
$$;

-- The only anonymous mutation endpoint for recipient links.  Its token check
-- precedes every update and its membership predicate excludes unrelated guests.
CREATE OR REPLACE FUNCTION public.save_guest_invitation_rsvps(_access_token text, _responses jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  token_event_id uuid;
  token_guest_id uuid;
  token_family_group text;
  response jsonb;
  response_guest_id uuid;
  response_rsvp text;
BEGIN
  IF jsonb_typeof(_responses) <> 'array' OR jsonb_array_length(_responses) > 20 THEN
    RAISE EXCEPTION 'Invalid RSVP response list';
  END IF;

  SELECT gat.event_id, gat.guest_id, g.family_group
    INTO token_event_id, token_guest_id, token_family_group
  FROM public.guest_access_tokens gat
  JOIN public.guests g ON g.id = gat.guest_id AND g.event_id = gat.event_id
  JOIN public.events e ON e.id = gat.event_id AND e.qr_apply_to_live_view = true
  WHERE gat.access_token = _access_token AND gat.expires_at > now();

  IF token_guest_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired invitation link'; END IF;

  FOR response IN SELECT value FROM jsonb_array_elements(_responses) LOOP
    response_guest_id := NULLIF(response->>'guest_id', '')::uuid;
    response_rsvp := response->>'rsvp';
    IF response_guest_id IS NULL OR response_rsvp NOT IN ('Pending', 'Attending', 'Not Attending') THEN
      RAISE EXCEPTION 'Invalid RSVP response';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.guests g
      WHERE g.id = response_guest_id AND g.event_id = token_event_id
        AND (g.id = token_guest_id OR (token_family_group IS NOT NULL AND g.family_group = token_family_group))
    ) THEN RAISE EXCEPTION 'Invitation is not authorised for this guest'; END IF;
    UPDATE public.guests
      SET rsvp = response_rsvp, rsvp_date = CURRENT_DATE
      WHERE id = response_guest_id AND event_id = token_event_id;
  END LOOP;

  UPDATE public.guest_access_tokens SET last_used_at = now()
    WHERE event_id = token_event_id AND guest_id = token_guest_id AND access_token = _access_token;
  RETURN true;
END;
$$;

-- Legacy public write APIs accepted raw event/guest IDs. Recipient-token links
-- no longer call them; keep authenticated dashboard use intact.
REVOKE EXECUTE ON FUNCTION public.get_guest_details_form(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_guest_details_form(uuid, uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_guest_rsvp_public(uuid, uuid, text, text, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_guest_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.save_guest_invitation_rsvps(text, jsonb) TO anon;
