
-- Function to rebuild relation_display for all guests of an event
CREATE OR REPLACE FUNCTION public.sync_relation_display_for_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner1 text;
  v_partner2 text;
  v_custom_roles jsonb;
BEGIN
  SELECT partner1_name, partner2_name, COALESCE(custom_roles, '[]'::jsonb)
  INTO v_partner1, v_partner2, v_custom_roles
  FROM events
  WHERE id = p_event_id;

  -- Update all guests that have both relation_partner and relation_role set
  UPDATE guests
  SET relation_display = (
    CASE
      WHEN relation_partner = '' OR relation_role = '' THEN ''
      ELSE
        -- Resolve partner name
        (CASE
          WHEN relation_partner = 'partner_one' THEN COALESCE(NULLIF(TRIM(v_partner1), ''), 'Partner 1')
          WHEN relation_partner = 'partner_two' THEN COALESCE(NULLIF(TRIM(v_partner2), ''), 'Partner 2')
          ELSE ''
        END)
        || ' / '
        || (
          -- Resolve role label
          CASE
            WHEN relation_role = 'bridal_party' THEN 'Bridal Party'
            WHEN relation_role = 'father' THEN 'Father'
            WHEN relation_role = 'mother' THEN 'Mother'
            WHEN relation_role = 'brother' THEN 'Brother'
            WHEN relation_role = 'sister' THEN 'Sister'
            WHEN relation_role = 'cousin' THEN 'Cousin'
            WHEN relation_role = 'uncle' THEN 'Uncle'
            WHEN relation_role = 'aunty' THEN 'Aunty'
            WHEN relation_role = 'guest' THEN 'Guest'
            WHEN relation_role = 'vendor' THEN 'Vendor'
            WHEN relation_role LIKE 'custom_%' THEN
              -- Look up custom role label from event custom_roles array
              COALESCE(
                (SELECT cr.value::text
                 FROM jsonb_array_elements_text(v_custom_roles) AS cr(value)
                 WHERE 'custom_' || LOWER(REPLACE(cr.value::text, ' ', '_')) = relation_role
                 LIMIT 1),
                REPLACE(SUBSTRING(relation_role FROM 8), '_', ' ')
              )
            ELSE relation_role
          END
        )
    END
  )
  WHERE event_id = p_event_id
    AND relation_partner != ''
    AND relation_role != '';
END;
$$;

-- Trigger function that fires when partner names change on events
CREATE OR REPLACE FUNCTION public.trigger_sync_relation_display()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if partner names actually changed
  IF (OLD.partner1_name IS DISTINCT FROM NEW.partner1_name)
     OR (OLD.partner2_name IS DISTINCT FROM NEW.partner2_name) THEN
    PERFORM sync_relation_display_for_event(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_sync_relation_display ON events;
CREATE TRIGGER trg_sync_relation_display
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_relation_display();
