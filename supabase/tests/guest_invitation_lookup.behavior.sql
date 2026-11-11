-- Synthetic records only. The runner rolls back this entire fixture.
INSERT INTO public.events(id, name, slug, qr_apply_to_live_view, public_show_venue, venue) VALUES
 ('10000000-0000-0000-0000-000000000001', 'First event', 'first-event', true, false, 'Private venue'),
 ('10000000-0000-0000-0000-000000000002', 'Other event', 'other-event', true, true, 'Other venue'),
 ('10000000-0000-0000-0000-000000000003', 'Disabled event', 'disabled-event', false, true, 'Disabled venue');
INSERT INTO public.guests(id, event_id, first_name, family_group) VALUES
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Recipient', 'family-a'),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Family', 'family-a'),
 ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Unrelated', null),
 ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Other', 'family-a'),
 ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Disabled', null);
INSERT INTO public.guest_access_tokens(event_id, guest_id, access_token, expires_at) VALUES
 ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'valid-recipient', now() + interval '1 day'),
 ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'valid-unrelated', now() + interval '1 day'),
 ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'expired', now() - interval '1 day'),
 ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'other-event-token', now() + interval '1 day'),
 ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', 'disabled-event-token', now() + interval '1 day');

-- Signed-out requests have no JWT and no underlying table access.
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_event_with_data_secure(text,text) TO anon;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_public_event_with_data_secure('first-event', 'valid-recipient')) <> 2 THEN
    RAISE EXCEPTION 'Valid recipient must see only their family';
  END IF;
  IF (SELECT count(*) FROM public.get_public_event_with_data_secure('first-event', 'valid-unrelated')) <> 1 THEN
    RAISE EXCEPTION 'Recipient without family must see only themselves';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('first-event', 'invalid')) THEN
    RAISE EXCEPTION 'Invalid token must return no rows';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('first-event', '')) THEN
    RAISE EXCEPTION 'Empty token must not fall back to public access';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('first-event', 'expired')) THEN
    RAISE EXCEPTION 'Expired token must return no rows';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('first-event', 'other-event-token')) THEN
    RAISE EXCEPTION 'Cross-event token must return no rows';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('disabled-event', 'disabled-event-token')) THEN
    RAISE EXCEPTION 'Disabled public access must remain disabled';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('missing-event', 'valid-recipient')) THEN
    RAISE EXCEPTION 'Unknown slug must return no rows';
  END IF;
  IF (SELECT count(*) FROM public.get_public_event_with_data_secure('first-event', null)) <> 3 THEN
    RAISE EXCEPTION 'Existing tokenless QR/seating contract must remain unchanged';
  END IF;
  IF EXISTS(SELECT FROM public.get_public_event_with_data_secure('first-event', 'valid-recipient') WHERE event_venue IS NOT NULL) THEN
    RAISE EXCEPTION 'Event privacy setting must remain enforced';
  END IF;
END $$;
RESET ROLE;
