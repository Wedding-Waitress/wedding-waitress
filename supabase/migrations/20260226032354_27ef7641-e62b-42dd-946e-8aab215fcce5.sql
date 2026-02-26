CREATE OR REPLACE FUNCTION public.add_guest_public(
  _event_id UUID,
  _first_name TEXT,
  _last_name TEXT,
  _rsvp TEXT DEFAULT 'Attending',
  _dietary TEXT DEFAULT 'NA',
  _mobile TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner_id UUID;
  _new_guest_id UUID;
BEGIN
  -- Validate event exists and has live view enabled
  SELECT user_id INTO _owner_id
  FROM events
  WHERE id = _event_id AND qr_apply_to_live_view = true;

  IF _owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Insert new guest
  INSERT INTO guests (event_id, user_id, first_name, last_name, rsvp, dietary, mobile, email)
  VALUES (_event_id, _owner_id, _first_name, _last_name, _rsvp, COALESCE(_dietary, 'NA'), _mobile, _email)
  RETURNING id INTO _new_guest_id;

  -- Log the addition
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _new_guest_id, jsonb_build_object(
    'action', 'add_guest',
    'first_name', _first_name,
    'last_name', _last_name
  ), 'public_live_view');

  RETURN _new_guest_id;
END;
$$;