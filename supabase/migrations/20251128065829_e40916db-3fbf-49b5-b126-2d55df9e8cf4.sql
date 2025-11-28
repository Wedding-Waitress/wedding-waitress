-- Create a public RPC function to update guest RSVP data securely
-- This bypasses RLS for public updates while maintaining security checks
CREATE OR REPLACE FUNCTION public.update_guest_rsvp_public(
  _guest_id UUID,
  _event_id UUID,
  _rsvp TEXT DEFAULT NULL,
  _dietary TEXT DEFAULT NULL,
  _mobile TEXT DEFAULT NULL,
  _email TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_exists BOOLEAN;
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
  
  -- Perform the update (only non-null values)
  UPDATE guests SET
    rsvp = COALESCE(_rsvp, rsvp),
    dietary = COALESCE(_dietary, dietary),
    mobile = COALESCE(_mobile, mobile),
    email = COALESCE(_email, email),
    notes = COALESCE(_notes, notes),
    rsvp_date = CASE WHEN _rsvp IS NOT NULL THEN CURRENT_DATE ELSE rsvp_date END
  WHERE id = _guest_id AND event_id = _event_id;
  
  -- Log the change
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _guest_id, jsonb_build_object(
    'rsvp', _rsvp,
    'dietary', _dietary,
    'mobile', _mobile,
    'email', _email,
    'notes', _notes
  ), 'public_live_view');
  
  RETURN true;
END;
$$;