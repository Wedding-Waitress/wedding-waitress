
-- Add column to track which guest added another guest
ALTER TABLE public.guests ADD COLUMN added_by_guest_id UUID REFERENCES public.guests(id);

-- Update the add_guest_public function to accept the new parameter
CREATE OR REPLACE FUNCTION public.add_guest_public(
  _event_id uuid, 
  _first_name text, 
  _last_name text, 
  _rsvp text DEFAULT 'Attending'::text, 
  _dietary text DEFAULT 'NA'::text, 
  _mobile text DEFAULT NULL::text, 
  _email text DEFAULT NULL::text,
  _added_by_guest_id uuid DEFAULT NULL::uuid
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  INSERT INTO guests (event_id, user_id, first_name, last_name, rsvp, dietary, mobile, email, added_by_guest_id)
  VALUES (_event_id, _owner_id, _first_name, _last_name, _rsvp, COALESCE(_dietary, 'NA'), _mobile, _email, _added_by_guest_id)
  RETURNING id INTO _new_guest_id;

  -- Log the addition
  INSERT INTO guest_update_logs (event_id, guest_id, payload, changed_by)
  VALUES (_event_id, _new_guest_id, jsonb_build_object(
    'action', 'add_guest',
    'first_name', _first_name,
    'last_name', _last_name,
    'added_by_guest_id', _added_by_guest_id
  ), 'public_live_view');

  RETURN _new_guest_id;
END;
$function$;
