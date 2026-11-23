import { supabase } from '@/integrations/supabase/client';
import { getHeadParticipantReconciliationOrder, parseHeadSeatingOrder, getPrimaryGuestIds } from '@/lib/headTable';

const requests = new Map<string, Promise<boolean>>();

/** Authorised, event-scoped repair using the existing transactional seating RPC. */
export async function reconcileHeadTableParticipants(eventId: string): Promise<boolean> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return false;
  const actorId = auth.user.id;
  const key = actorId + ':' + eventId;
  if (requests.has(key)) return requests.get(key)!;
  const request = (async () => {
    const access=await supabase.rpc('can_access_event',{_user_id:actorId,_event_id:eventId});
    if(access.error)throw access.error;if(access.data!==true)return false;
    const { data: event, error: eventError } = await supabase.from('events')
      .select('id, user_id, partner1_name, partner2_name, setup_details').eq('id', eventId).maybeSingle();
    if (eventError) throw eventError;
    if (!event) return false;
    const ownerId=event.user_id;
    const [tableResult, guestResult] = await Promise.all([
      supabase.from('tables').select('*').eq('event_id', eventId).eq('user_id', ownerId).eq('table_purpose', 'head'),
      supabase.from('guests').select('id, event_id, user_id, first_name, last_name, guided_setup_origin, table_id, seat_no, assigned').eq('event_id', eventId).eq('user_id', ownerId),
    ]);
    if (tableResult.error) throw tableResult.error;
    if (guestResult.error) throw guestResult.error;
    const tables = tableResult.data || [];
    const guests = guestResult.data || [];
    if (tables.length !== 1) return false;
    const table = { ...tables[0], primary_guest_ids: getPrimaryGuestIds(event) };
    const order = getHeadParticipantReconciliationOrder(table, guests, event.partner1_name, event.partner2_name);
    if (order) {
      const { error } = await (supabase.rpc as any)('save_head_table_seating', { p_table_id: table.id, p_order: order });
      if (error) throw error;
    }
    // Older RPCs persist table/seat but leave the legacy assigned flag unchanged.
    const activeOrder = order || parseHeadSeatingOrder(table.head_seating_order);
    const assignedIds = activeOrder.flatMap(entry => entry.kind === 'guest' ? [entry.guest_id] : []);
    const staleIds = guests.filter(guest => !guest.assigned && assignedIds.includes(guest.id) && (guest.table_id === table.id || !!order)).map(guest => guest.id);
    if (staleIds.length) {
      const { error } = await supabase.from('guests').update({ assigned: true })
        .eq('event_id', eventId).eq('user_id', ownerId).eq('table_id', table.id).in('id', staleIds);
      if (error) throw error;
    }
    return !!order || staleIds.length > 0;
  })().finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}
