-- Semantic, inclusive Head Table support.
-- This migration is intentionally additive: every existing table remains standard.

alter table public.tables
  add column if not exists table_purpose text not null default 'standard',
  add column if not exists head_seating_order jsonb not null default '[]'::jsonb;

alter table public.tables
  add constraint tables_table_purpose_check
  check (table_purpose in ('standard', 'head')),
  add constraint tables_head_geometry_check
  check (table_purpose <> 'head' or table_type = 'long'),
  add constraint tables_head_seating_order_array_check
  check (jsonb_typeof(head_seating_order) = 'array');

create unique index if not exists uq_tables_one_head_per_event
  on public.tables (event_id)
  where table_purpose = 'head';

comment on column public.tables.table_purpose is
  'Stable semantic purpose. Head tables are never inferred from their visible name.';
comment on column public.tables.head_seating_order is
  'Authoritative left-to-right order as viewed by guests. Entries reference primary participant keys or existing guest IDs.';

create or replace function public.save_head_table_seating(
  p_table_id uuid,
  p_order jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_event_id uuid;
  v_capacity integer;
  v_guest_ids uuid[];
begin
  if jsonb_typeof(p_order) <> 'array' then
    raise exception 'Head Table seating order must be an array';
  end if;

  select event_id, limit_seats
    into v_event_id, v_capacity
    from public.tables
   where id = p_table_id
     and table_purpose = 'head'
   for update;

  if v_event_id is null then
    raise exception 'Head Table not found';
  end if;

  if jsonb_array_length(p_order) > v_capacity then
    raise exception 'Head Table seating order exceeds table capacity';
  end if;

  select coalesce(array_agg((entry->>'guest_id')::uuid), '{}'::uuid[])
    into v_guest_ids
    from jsonb_array_elements(p_order) entry
   where entry->>'kind' = 'guest'
     and entry ? 'guest_id';

  if cardinality(v_guest_ids) <> (
    select count(distinct guest_id) from unnest(v_guest_ids) guest_id
  ) then
    raise exception 'A guest cannot appear more than once in Head Table seating';
  end if;

  if exists (
    select 1
      from public.guests g
     where g.id = any(v_guest_ids)
       and (g.event_id <> v_event_id or (g.table_id is not null and g.table_id <> p_table_id))
  ) then
    raise exception 'One or more guests are unavailable for this Head Table';
  end if;

  update public.guests
     set table_id = null, table_no = null, seat_no = null
   where table_id = p_table_id
     and not (id = any(v_guest_ids));

  update public.guests g
     set table_id = p_table_id,
         table_no = null,
         seat_no = floor((v_capacity - jsonb_array_length(p_order)) / 2.0)::integer + ordered.position
    from (
      select (entry->>'guest_id')::uuid as guest_id, ordinal::integer as position
        from jsonb_array_elements(p_order) with ordinality as ordered_values(entry, ordinal)
       where entry->>'kind' = 'guest'
    ) ordered
   where g.id = ordered.guest_id;

  update public.tables
     set head_seating_order = p_order,
         updated_at = now()
   where id = p_table_id;
end;
$$;

create or replace function public.get_public_table_semantics(
  p_table_id uuid,
  p_event_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'table_purpose', t.table_purpose,
    'head_seating_order', t.head_seating_order,
    'participant1_name', e.partner1_name,
    'participant2_name', e.partner2_name
  )
  from public.tables t
  join public.events e on e.id = t.event_id
  where t.id = p_table_id
    and t.event_id = p_event_id
    and e.qr_apply_to_live_view = true
  limit 1;
$$;

grant execute on function public.get_public_table_semantics(uuid, uuid) to anon, authenticated;

-- Keep the token-gated Reception share payload on the same authoritative model.
create or replace function public.get_reception_floor_plan_by_share_token(_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_row public.reception_floor_plans%rowtype;
  event_row public.events%rowtype;
  tables_json jsonb;
begin
  if _token is null or length(_token) < 16 then return null; end if;

  select * into plan_row
    from public.reception_floor_plans
   where share_token = _token and share_enabled = true
   limit 1;
  if not found then return null; end if;

  select * into event_row from public.events where id = plan_row.event_id limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'table_no', t.table_no,
    'limit_seats', t.limit_seats,
    'table_type', t.table_type,
    'table_purpose', t.table_purpose,
    'head_seating_order', t.head_seating_order,
    'guest_count', (select count(*) from public.guests g where g.table_id = t.id),
    'occupied_seat_numbers', coalesce((
      select jsonb_agg(g.seat_no order by g.seat_no)
        from public.guests g
       where g.table_id = t.id and g.seat_no is not null
    ), '[]'::jsonb)
  ) order by (t.table_purpose = 'head') desc, t.table_no, t.name), '[]'::jsonb)
  into tables_json
  from public.tables t
  where t.event_id = plan_row.event_id;

  return jsonb_build_object(
    'plan', jsonb_build_object(
      'id', plan_row.id,
      'event_id', plan_row.event_id,
      'room_shape', plan_row.room_shape,
      'room_width_m', plan_row.room_width_m,
      'room_length_m', plan_row.room_length_m,
      'grid_size_cm', plan_row.grid_size_cm,
      'table_positions', plan_row.table_positions,
      'fixtures', plan_row.fixtures,
      'room_polygon', plan_row.room_polygon,
      'background_image_url', plan_row.background_image_url,
      'background_x', plan_row.background_x,
      'background_y', plan_row.background_y,
      'background_width', plan_row.background_width,
      'background_height', plan_row.background_height,
      'background_rotation', plan_row.background_rotation,
      'background_opacity', plan_row.background_opacity,
      'background_locked', plan_row.background_locked,
      'background_visible', plan_row.background_visible,
      'approval_status', plan_row.approval_status,
      'vendor_notes', plan_row.vendor_notes,
      'last_saved_at', plan_row.last_saved_at
    ),
    'event', jsonb_build_object(
      'name', event_row.name,
      'date', event_row.date,
      'venue', event_row.venue,
      'partner1_name', event_row.partner1_name,
      'partner2_name', event_row.partner2_name,
      'start_time', event_row.start_time,
      'finish_time', event_row.finish_time
    ),
    'tables', tables_json
  );
end;
$$;
