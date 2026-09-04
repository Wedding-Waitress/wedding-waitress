-- Live, rollback-only verification for 20260902091154.
-- Run against the linked Wedding Waitress project with:
-- supabase db query --linked --file supabase/tests/guided_setup_table_dependencies.sql

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $setup$
DECLARE
  selected_event record;
BEGIN
  SELECT e.id, e.user_id
  INTO selected_event
  FROM public.events e
  WHERE e.user_id IS NOT NULL
  ORDER BY e.created_at, e.id
  LIMIT 1;

  IF selected_event.id IS NULL THEN
    RAISE EXCEPTION 'A rollback-only test requires one existing event';
  END IF;

  PERFORM set_config('guided_setup_test.event_id', selected_event.id::text, true);
  PERFORM set_config('guided_setup_test.user_id', selected_event.user_id::text, true);
  PERFORM set_config(
    'guided_setup_test.table_no',
    (
      SELECT (COALESCE(MAX(t.table_no), 0) + 1000)::text
      FROM public.tables t
      WHERE t.event_id = selected_event.id
    ),
    true
  );
  PERFORM set_config('request.jwt.claim.sub', selected_event.user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
END
$setup$;

SET LOCAL ROLE authenticated;

DO $tests$
DECLARE
  event_id_under_test uuid := current_setting('guided_setup_test.event_id')::uuid;
  user_id_under_test uuid := current_setting('guided_setup_test.user_id')::uuid;
  table_no_under_test integer := current_setting('guided_setup_test.table_no')::integer;
  default_row public.tables%ROWTYPE;
  head_row public.tables%ROWTYPE;
BEGIN
  INSERT INTO public.tables (event_id, user_id, name, limit_seats, table_no, table_type)
  VALUES (event_id_under_test, user_id_under_test, 'Guided Setup rollback test', 8, table_no_under_test, 'round')
  RETURNING * INTO default_row;

  IF default_row.table_purpose <> 'standard'
     OR default_row.head_seating_order <> '[]'::jsonb THEN
    RAISE EXCEPTION 'Standard-table defaults were not applied';
  END IF;

  INSERT INTO public.tables (
    event_id,
    user_id,
    name,
    limit_seats,
    table_no,
    table_type,
    table_purpose,
    head_seating_order
  )
  VALUES (
    event_id_under_test,
    user_id_under_test,
    'Head Table',
    10,
    NULL,
    'long',
    'head',
    '[{"seat":1},{"seat":2}]'::jsonb
  )
  RETURNING * INTO head_row;

  IF head_row.table_purpose <> 'head'
     OR head_row.table_type <> 'long'
     OR head_row.head_seating_order <> '[{"seat":1},{"seat":2}]'::jsonb THEN
    RAISE EXCEPTION 'Head Table semantic fields were not saved correctly';
  END IF;

  BEGIN
    INSERT INTO public.tables (event_id, user_id, name, limit_seats, table_no, table_type)
    VALUES (event_id_under_test, user_id_under_test, 'Duplicate Standard', 8, table_no_under_test, 'round');
    RAISE EXCEPTION 'Duplicate Standard table number was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.tables (
      event_id, user_id, name, limit_seats, table_no, table_type, table_purpose
    ) VALUES (
      event_id_under_test, user_id_under_test, 'Duplicate Head Table', 10, NULL, 'long', 'head'
    );
    RAISE EXCEPTION 'A second Head Table was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.tables (
      event_id, user_id, name, limit_seats, table_no, table_type, table_purpose
    ) VALUES (
      event_id_under_test, user_id_under_test, 'Invalid Purpose', 8, table_no_under_test + 1, 'round', 'other'
    );
    RAISE EXCEPTION 'An unsupported table_purpose was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.tables (
      event_id, user_id, name, limit_seats, table_no, table_type, table_purpose
    ) VALUES (
      event_id_under_test, user_id_under_test, 'Invalid Head Geometry', 10, NULL, 'round', 'head'
    );
    RAISE EXCEPTION 'A non-long Head Table was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.tables (
      event_id, user_id, name, limit_seats, table_no, table_type, head_seating_order
    ) VALUES (
      event_id_under_test, user_id_under_test, 'Invalid Seating Order', 8, table_no_under_test + 2, 'round', '{}'::jsonb
    );
    RAISE EXCEPTION 'A non-array head_seating_order was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  RAISE NOTICE 'PASS: defaults, Standard/Head creation, semantic values, and duplicate/constraint enforcement';
END
$tests$;

RESET ROLE;
ROLLBACK;
