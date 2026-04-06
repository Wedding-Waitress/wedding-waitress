CREATE OR REPLACE FUNCTION public.update_referring_guest_notes(
  _referring_guest_id uuid,
  _event_id uuid,
  _note_text text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_notes TEXT;
BEGIN
  -- Validate event has live view enabled
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND qr_apply_to_live_view = true
  ) THEN
    RETURN FALSE;
  END IF;

  -- Validate guest belongs to the event
  IF NOT EXISTS (
    SELECT 1 FROM guests WHERE id = _referring_guest_id AND event_id = _event_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- Get existing notes and strip old [NEW+] marker
  SELECT COALESCE(REPLACE(notes, '[NEW+]', ''), '')
  INTO _existing_notes
  FROM guests
  WHERE id = _referring_guest_id;

  -- Prepend [NEW+] marker and append new note
  UPDATE guests
  SET notes = '[NEW+]' || CASE WHEN _existing_notes != '' THEN _existing_notes || E'\n' ELSE '' END || _note_text
  WHERE id = _referring_guest_id;

  RETURN TRUE;
END;
$$;