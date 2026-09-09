create or replace function public.get_public_table_semantics(p_table_id uuid, p_event_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
select jsonb_build_object('table_purpose',t.table_purpose,'head_seating_order',t.head_seating_order,'participant1_name',e.partner1_name,'participant2_name',e.partner2_name)
from public.tables t join public.events e on e.id=t.event_id
where t.id=p_table_id and t.event_id=p_event_id and e.qr_apply_to_live_view=true limit 1;
$$;
revoke all on function public.get_public_table_semantics(uuid,uuid) from public;
grant execute on function public.get_public_table_semantics(uuid,uuid) to anon,authenticated;
notify pgrst, 'reload schema';
