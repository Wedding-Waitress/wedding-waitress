
CREATE OR REPLACE FUNCTION public.public_manage_guest_group(
  _event_id uuid,
  _new_guest_id uuid,
  _referring_guest_id uuid,
  _guest_type text -- 'individual', 'couple', 'family'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ref_family_group TEXT;
  _ref_table_id UUID;
  _ref_table_no INTEGER;
  _ref_first_name TEXT;
  _ref_last_name TEXT;
  _new_first_name TEXT;
  _new_last_name TEXT;
  _family_group_id UUID;
  _couple_group_name TEXT;
  _couple_group_id UUID;
BEGIN
  -- Validate both guests belong to the same live-view-enabled event
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = _event_id AND qr_apply_to_live_view = true
  ) THEN
    RAISE EXCEPTION 'Event not found or live view not enabled';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM guests WHERE id = _referring_guest_id AND event_id = _event_id) THEN
    RAISE EXCEPTION 'Referring guest not found in this event';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM guests WHERE id = _new_guest_id AND event_id = _event_id) THEN
    RAISE EXCEPTION 'New guest not found in this event';
  END IF;

  -- Get referring guest data
  SELECT family_group, table_id, table_no, first_name, COALESCE(last_name, '')
  INTO _ref_family_group, _ref_table_id, _ref_table_no, _ref_first_name, _ref_last_name
  FROM guests WHERE id = _referring_guest_id;

  -- Get new guest name
  SELECT first_name, COALESCE(last_name, '')
  INTO _new_first_name, _new_last_name
  FROM guests WHERE id = _new_guest_id;

  IF _guest_type = 'family' THEN
    -- FAMILY: Add new guest to referring guest's family group, inherit table
    
    -- If referring guest has a family_group, use it; otherwise create one
    IF _ref_family_group IS NULL OR _ref_family_group = '' THEN
      _ref_family_group := _ref_last_name || ' Family';
      -- Update referring guest's family_group
      UPDATE guests SET family_group = _ref_family_group WHERE id = _referring_guest_id;
    END IF;

    -- Set new guest's family_group and table assignment
    UPDATE guests 
    SET family_group = _ref_family_group,
        table_id = _ref_table_id,
        table_no = _ref_table_no,
        assigned = CASE WHEN _ref_table_id IS NOT NULL THEN true ELSE assigned END
    WHERE id = _new_guest_id;

    -- Upsert family_groups row
    SELECT id INTO _family_group_id
    FROM family_groups
    WHERE event_id = _event_id AND name = _ref_family_group
    LIMIT 1;

    IF _family_group_id IS NULL THEN
      INSERT INTO family_groups (event_id, name)
      VALUES (_event_id, _ref_family_group)
      RETURNING id INTO _family_group_id;

      -- Also add the referring guest as a member if not already there
      INSERT INTO family_group_members (group_id, guest_id)
      VALUES (_family_group_id, _referring_guest_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add new guest as member
    INSERT INTO family_group_members (group_id, guest_id)
    VALUES (_family_group_id, _new_guest_id)
    ON CONFLICT DO NOTHING;

  ELSIF _guest_type = 'couple' THEN
    -- COUPLE: Move referring guest out of current family, create couple group
    
    -- Remove referring guest from old family_group_members
    IF _ref_family_group IS NOT NULL AND _ref_family_group != '' THEN
      DELETE FROM family_group_members
      WHERE guest_id = _referring_guest_id
        AND group_id IN (SELECT id FROM family_groups WHERE event_id = _event_id AND name = _ref_family_group);
    END IF;

    -- Create couple group name
    _couple_group_name := _ref_first_name || ' & ' || _new_first_name || ' Couple';

    -- Update both guests' family_group
    UPDATE guests SET family_group = _couple_group_name WHERE id = _referring_guest_id;
    UPDATE guests 
    SET family_group = _couple_group_name,
        table_id = _ref_table_id,
        table_no = _ref_table_no,
        assigned = CASE WHEN _ref_table_id IS NOT NULL THEN true ELSE assigned END
    WHERE id = _new_guest_id;

    -- Create couple group in family_groups
    INSERT INTO family_groups (event_id, name)
    VALUES (_event_id, _couple_group_name)
    RETURNING id INTO _couple_group_id;

    -- Add both as members
    INSERT INTO family_group_members (group_id, guest_id)
    VALUES (_couple_group_id, _referring_guest_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO family_group_members (group_id, guest_id)
    VALUES (_couple_group_id, _new_guest_id)
    ON CONFLICT DO NOTHING;

  ELSIF _guest_type = 'individual' THEN
    -- SINGLE: New guest stays standalone, no group changes
    UPDATE guests SET family_group = NULL WHERE id = _new_guest_id;
  END IF;
END;
$function$;
