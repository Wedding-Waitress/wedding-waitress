import { supabase } from '@/integrations/supabase/client';
import { getPrimaryGuestIds } from './headTable';
import { planHeadTableMove, planHeadTableReorder, type HeadMove, type HeadMovePlan, type SeatingGuest, type SeatingSnapshot } from './headTableMoves';
const activeEvents = new Set<string>();
export const isHeadTableMoveActive = (eventId:string) => activeEvents.has(eventId);
const seatFields = (guest:SeatingGuest) => ({table_id:guest.table_id,table_no:guest.table_no,seat_no:guest.seat_no,assigned:guest.assigned??false});
function match(query:any,fields:Record<string,unknown>){for(const [key,value] of Object.entries(fields))query=value==null?query.is(key,null):query.eq(key,value);return query;}

/** Compare each saved seat with the fresh snapshot. Recover our writes on failure without overwriting newer edits. */
export async function persistHeadMovePlan(plan:HeadMovePlan,client:any=supabase):Promise<void>{
 const changedHeads:Array<{before:any;after:any}>=[];
 const touched=new Map<string,{before:SeatingGuest;current:SeatingGuest}>();
 const writeGuest=async(expected:SeatingGuest,fields:Record<string,unknown>)=>{
  let query=client.from('guests').update(fields).eq('id',expected.id).eq('event_id',plan.eventId).eq('user_id',plan.ownerId);
  query=match(query,{table_id:expected.table_id,table_no:expected.table_no,seat_no:expected.seat_no});
  const {data,error}=await query.select('*').single();
  if(error||!data)throw error||new Error('A guest was changed in another session. Refresh and try again.');
  return data as SeatingGuest;
 };
 try{
  // Remove old participant reservations before making a moved partner unassigned.
  for(const head of plan.heads){
   let query=client.from('tables').update({head_seating_order:head.order}).eq('id',head.table.id).eq('event_id',plan.eventId).eq('user_id',plan.ownerId).eq('head_seating_order',JSON.stringify(head.table.head_seating_order));
   if(head.table.updated_at)query=query.eq('updated_at',head.table.updated_at);
   const {data,error}=await query.select('*').single();if(error||!data)throw error||new Error('Head Table changed in another session. Refresh and try again.');
   changedHeads.push({before:head.table,after:data});
  }
  // Free affected seat numbers first, so swaps and insertions cannot collide with our own old seats.
  for(const change of plan.guests){const current=await writeGuest(change.before,{seat_no:null});touched.set(change.before.id,{before:change.before,current});}
  for(const change of plan.guests){const record=touched.get(change.before.id)!;record.current=await writeGuest(record.current,seatFields(change.after));}
 }catch(error){
  const recoveryErrors:unknown[]=[];const restored=new Set<string>();
  for(const [id,record] of touched){try{record.current=await writeGuest(record.current,{seat_no:null});restored.add(id);}catch(recoveryError){recoveryErrors.push(recoveryError);}}
  for(const [id,record] of touched){if(!restored.has(id))continue;try{await writeGuest(record.current,seatFields(record.before));}catch(recoveryError){recoveryErrors.push(recoveryError);}}
  for(const head of changedHeads.reverse()){
   try{let query=client.from('tables').update({head_seating_order:head.before.head_seating_order}).eq('id',head.before.id).eq('event_id',plan.eventId).eq('user_id',plan.ownerId).eq('head_seating_order',JSON.stringify(head.after.head_seating_order));if(head.after.updated_at)query=query.eq('updated_at',head.after.updated_at);const result=await query.select('id').single();if(result.error||!result.data)throw result.error||new Error('Head Table changed during recovery.');}catch(recoveryError){recoveryErrors.push(recoveryError);}
  }
  if(recoveryErrors.length)throw new Error('The move failed and another change prevented complete recovery. Refresh the event before continuing.');
  throw error;
 }
}
async function readSnapshot(eventId:string):Promise<SeatingSnapshot>{
 const {data:auth,error:authError}=await supabase.auth.getUser();if(authError)throw authError;if(!auth.user)throw new Error('Please sign in again.');
 const {data:event,error:eventError}=await supabase.from('events').select('id,user_id,partner1_name,partner2_name,setup_details').eq('id',eventId).single();if(eventError||!event)throw eventError||new Error('Event not found.');
 const [tables,guests]=await Promise.all([supabase.from('tables').select('*').eq('event_id',eventId).eq('user_id',event.user_id),supabase.from('guests').select('*').eq('event_id',eventId).eq('user_id',event.user_id)]);
 if(tables.error)throw tables.error;if(guests.error)throw guests.error;
 return {eventId,ownerId:event.user_id,partner1:event.partner1_name,partner2:event.partner2_name,tables:tables.data.map(table=>({...table,primary_guest_ids:getPrimaryGuestIds(event)})),guests:guests.data};
}
export async function changeHeadTableSeating(eventId:string,action:HeadMove|{tableId:string;orderedGuestIds:string[]}):Promise<boolean>{
 if(activeEvents.has(eventId))throw new Error('Please wait for the previous seating move to finish.');activeEvents.add(eventId);
 try{const snapshot=await readSnapshot(eventId);const plan='guestId' in action?planHeadTableMove(snapshot,action):planHeadTableReorder(snapshot,action.tableId,action.orderedGuestIds);if(!plan)return false;await persistHeadMovePlan(plan);return true;}finally{activeEvents.delete(eventId);}
}
