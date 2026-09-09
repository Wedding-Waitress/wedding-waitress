-- Approved by Nader: complete the existing token-gated guest reception data.
-- Preserve the current access checks and payload; add live table counts and attendance.
CREATE OR REPLACE FUNCTION public.get_reception_floor_plan_by_share_token(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  plan_row public.reception_floor_plans%ROWTYPE;
  event_row public.events%ROWTYPE;
  tables_json jsonb;
  result jsonb;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO plan_row FROM public.reception_floor_plans
  WHERE share_token = _token AND share_enabled = true LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO event_row FROM public.events WHERE id = plan_row.event_id LIMIT 1;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id, 'name', t.name, 'table_no', t.table_no, 'limit_seats', t.limit_seats,
    'table_type', t.table_type, 'table_purpose', t.table_purpose,
    'head_seating_order', t.head_seating_order,
    'guest_count', (SELECT count(*) FROM public.guests g WHERE g.table_id = t.id AND g.event_id = plan_row.event_id),
    'occupied_seat_numbers', COALESCE((SELECT jsonb_agg(g.seat_no ORDER BY g.seat_no)
      FROM public.guests g WHERE g.table_id = t.id AND g.event_id = plan_row.event_id AND g.seat_no IS NOT NULL), '[]'::jsonb)
  ) ORDER BY t.table_no), '[]'::jsonb) INTO tables_json
  FROM public.tables t WHERE t.event_id = plan_row.event_id;
  result := jsonb_build_object(
    'plan', jsonb_build_object(
      'id', plan_row.id, 'event_id', plan_row.event_id, 'room_shape', plan_row.room_shape,
      'room_width_m', plan_row.room_width_m, 'room_length_m', plan_row.room_length_m,
      'grid_size_cm', plan_row.grid_size_cm, 'table_positions', plan_row.table_positions,
      'fixtures', plan_row.fixtures, 'room_polygon', plan_row.room_polygon,
      'background_image_url', plan_row.background_image_url, 'background_x', plan_row.background_x,
      'background_y', plan_row.background_y, 'background_width', plan_row.background_width,
      'background_height', plan_row.background_height, 'background_rotation', plan_row.background_rotation,
      'background_opacity', plan_row.background_opacity, 'background_locked', plan_row.background_locked,
      'background_visible', plan_row.background_visible, 'approval_status', plan_row.approval_status,
      'vendor_notes', plan_row.vendor_notes, 'last_saved_at', plan_row.last_saved_at
    ),
    'event', jsonb_build_object(
      'name', event_row.name, 'date', event_row.date, 'venue', event_row.venue,
      'partner1_name', event_row.partner1_name, 'partner2_name', event_row.partner2_name,
      'start_time', event_row.start_time, 'finish_time', event_row.finish_time
    ),
    'tables', tables_json,
    'attending_count', (SELECT count(*) FROM public.guests g WHERE g.event_id = plan_row.event_id
      AND lower(trim(coalesce(g.rsvp, ''))) IN ('attending','confirmed','yes','y','going','accepted','confirm','accept'))
  );
  RETURN result;
END;
$function$;
