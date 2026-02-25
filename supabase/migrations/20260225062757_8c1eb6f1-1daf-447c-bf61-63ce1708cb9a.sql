CREATE OR REPLACE FUNCTION public.get_public_ceremony_floor_plan(event_slug text)
RETURNS TABLE(
  chairs_per_row integer,
  total_rows integer,
  assigned_rows integer,
  left_side_label text,
  right_side_label text,
  altar_label text,
  seat_assignments jsonb,
  show_row_numbers boolean,
  show_seat_numbers boolean,
  bridal_party_left jsonb,
  bridal_party_right jsonb,
  bridal_party_count_left integer,
  bridal_party_count_right integer,
  bridal_party_roles_left jsonb,
  bridal_party_roles_right jsonb,
  couple_side_arrangement text,
  person_left_name text,
  person_right_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cfp.chairs_per_row, cfp.total_rows, cfp.assigned_rows,
    cfp.left_side_label, cfp.right_side_label, cfp.altar_label,
    cfp.seat_assignments, cfp.show_row_numbers, cfp.show_seat_numbers,
    cfp.bridal_party_left, cfp.bridal_party_right,
    cfp.bridal_party_count_left, cfp.bridal_party_count_right,
    cfp.bridal_party_roles_left, cfp.bridal_party_roles_right,
    cfp.couple_side_arrangement, cfp.person_left_name, cfp.person_right_name
  FROM ceremony_floor_plans cfp
  JOIN events e ON e.id = cfp.event_id
  WHERE e.slug = event_slug
    AND e.qr_apply_to_live_view = true
  LIMIT 1;
$$;