-- Restore only the existing Tables-page save function; leave sharing functions and table definitions unchanged.
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

  -- Release occupied seat numbers before swapping positions. Both updates run
  -- in this function's transaction, so failures restore the original seating.
  update public.guests
     set seat_no = null
   where table_id = p_table_id
     and id = any(v_guest_ids);

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


REVOKE EXECUTE ON FUNCTION public.save_head_table_seating(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_head_table_seating(uuid, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
