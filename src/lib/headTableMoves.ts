import { parseHeadSeatingOrder, resolveHeadParticipantGuests, type HeadSeatEntry } from './headTable';
export interface SeatingGuest { id:string;event_id:string;user_id:string;first_name:string;last_name?:string|null;guided_setup_origin?:string|null;table_id:string|null;table_no:number|null;seat_no:number|null;assigned?:boolean|null }
export interface SeatingTable { id:string;event_id:string;user_id:string;name:string;limit_seats:number;table_no?:number|null;table_purpose:string;head_seating_order:unknown;primary_guest_ids?:Partial<Record<'primary_1'|'primary_2',string>>;updated_at?:string }
export interface SeatingSnapshot { eventId:string;ownerId:string;partner1?:string|null;partner2?:string|null;tables:SeatingTable[];guests:SeatingGuest[] }
export interface SeatingChange { before:SeatingGuest;after:SeatingGuest }
export interface HeadOrderChange { table:SeatingTable;order:HeadSeatEntry[] }
export interface HeadMovePlan { eventId:string;ownerId:string;guests:SeatingChange[];heads:HeadOrderChange[] }
export interface HeadMove { guestId:string;sourceTableId:string|null;destTableId:string|null;insertAtIndex?:number }
export const headEntrySeat = (entry:HeadSeatEntry,index:number,capacity:number,length:number) => entry.seat_no ?? Math.floor((capacity-length)/2)+index+1;
const bySeat=(a:SeatingGuest,b:SeatingGuest)=>(a.seat_no??Number.MAX_SAFE_INTEGER)-(b.seat_no??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id);
function reservations(table:SeatingTable,snapshot:SeatingSnapshot,people:SeatingGuest[],movingId?:string){
 const mapped=resolveHeadParticipantGuests(table,snapshot.guests,snapshot.partner1,snapshot.partner2);
 const order=parseHeadSeatingOrder(table.head_seating_order);
 return order.flatMap((entry,index)=>{
  if(entry.kind!=='participant')return [];
  const person=mapped[entry.participant];
  if(person && (person.id===movingId || people.some(guest=>guest.id===person.id&&guest.table_id===table.id)))return [];
  if(person?.table_id && person.table_id!==table.id)return [];
  return [{entry,seat:headEntrySeat(entry,index,table.limit_seats,order.length)}];
 });
}
function validateSeats(table:SeatingTable,people:SeatingGuest[],reserved:number[]){
 const occupied=people.filter(person=>person.table_id===table.id);
 if(occupied.length+reserved.length>table.limit_seats)throw new Error('This table is full.');
 const seats=occupied.map(person=>person.seat_no).filter((seat):seat is number=>seat!=null).concat(reserved);
 if(seats.some(seat=>!Number.isInteger(seat)||seat<1||seat>table.limit_seats)||new Set(seats).size!==seats.length)throw new Error('Seating changed or contains conflicting seat numbers. Refresh and try again.');
}
function finish(snapshot:SeatingSnapshot,people:SeatingGuest[],affected:Set<string>,movingId?:string):HeadMovePlan{
 const heads=snapshot.tables.filter(table=>affected.has(table.id)&&table.table_purpose==='head').map(table=>{
  const reserved=reservations(table,snapshot,people,movingId);
  validateSeats(table,people,reserved.map(item=>item.seat));
  const ordered:Array<{entry:HeadSeatEntry;seat:number}>=people.filter(person=>person.table_id===table.id).map(person=>{
   if(person.seat_no==null)throw new Error('Assign a seat to every existing Head Table guest before rearranging.');
   return {entry:{kind:'guest',guest_id:person.id,seat_no:person.seat_no},seat:person.seat_no};
  });
  ordered.push(...reserved.map(item=>({entry:{...item.entry,seat_no:item.seat},seat:item.seat})));
  return {table,order:ordered.sort((a,b)=>a.seat-b.seat).map(item=>item.entry)};
 });
 const changes=people.flatMap(after=>{const before=snapshot.guests.find(person=>person.id===after.id)!;return ['table_id','table_no','seat_no','assigned'].some(key=>before[key]!==after[key])?[{before,after}]:[];});
 return {eventId:snapshot.eventId,ownerId:snapshot.ownerId,guests:changes,heads};
}
function scope(snapshot:SeatingSnapshot){
 if(snapshot.tables.some(table=>table.event_id!==snapshot.eventId||table.user_id!==snapshot.ownerId)||snapshot.guests.some(person=>person.event_id!==snapshot.eventId||person.user_id!==snapshot.ownerId))throw new Error('Event/account seating mismatch.');
}
export function planHeadTableMove(snapshot:SeatingSnapshot,move:HeadMove):HeadMovePlan|null{
 scope(snapshot);
 const original=snapshot.guests.find(person=>person.id===move.guestId);
 if(!original||original.table_id!==move.sourceTableId)throw new Error('Guest seating changed. Refresh and try again.');
 const source=snapshot.tables.find(table=>table.id===move.sourceTableId);
 const dest=snapshot.tables.find(table=>table.id===move.destTableId);
 if((move.sourceTableId&&!source)||(move.destTableId&&!dest))throw new Error('Table does not belong to this event.');
 const reservedAt=snapshot.tables.filter(table=>table.table_purpose==='head'&&parseHeadSeatingOrder(table.head_seating_order).some(entry=>entry.kind==='participant'&&resolveHeadParticipantGuests(table,snapshot.guests,snapshot.partner1,snapshot.partner2)[entry.participant]?.id===move.guestId));
 if(source?.table_purpose!=='head'&&dest?.table_purpose!=='head'&&!reservedAt.length)return null;
 if(move.sourceTableId===move.destTableId)throw new Error('Use the seating order operation to reorder this table.');
 const people=snapshot.guests.map(person=>({...person}));const moving=people.find(person=>person.id===move.guestId)!;
 moving.table_id=null;moving.table_no=null;moving.seat_no=null;moving.assigned=false;
 if(dest){
  const existing=people.filter(person=>person.table_id===dest.id).sort(bySeat);
  const reserved=dest.table_purpose==='head'?reservations(dest,snapshot,people,move.guestId).map(item=>item.seat):[];
  validateSeats(dest,people,reserved);
  if(existing.length+reserved.length>=dest.limit_seats)throw new Error('This table is full.');
  if(existing.some(person=>person.seat_no==null))throw new Error('Assign existing table guests a seat number before inserting a guest.');
  const index=Math.max(0,Math.min(move.insertAtIndex??existing.length,existing.length));
  const occupied=new Set(existing.map(person=>person.seat_no).concat(reserved));
  const desired=existing[index]?.seat_no??((existing[existing.length-1]?.seat_no??0)+1);
  const free=Array.from({length:dest.limit_seats},(_,i)=>i+1).filter(seat=>!occupied.has(seat));
  const extra=free.find(seat=>seat>=desired)??free[free.length-1];
  const slots=existing.map(person=>person.seat_no!).concat(extra).sort((a,b)=>a-b);
  const ordered=[...existing];ordered.splice(index,0,moving);
  ordered.forEach((person,i)=>{person.seat_no=slots[i];if(person.id===moving.id){person.table_id=dest.id;person.table_no=dest.table_no??null;person.assigned=true;}});
  validateSeats(dest,people,reserved);
 }
 return finish(snapshot,people,new Set([move.sourceTableId,move.destTableId,...reservedAt.map(table=>table.id)].filter((id):id is string=>!!id)),move.guestId);
}
export function planHeadTableReorder(snapshot:SeatingSnapshot,tableId:string,ids:string[]):HeadMovePlan|null{
 scope(snapshot);const table=snapshot.tables.find(table=>table.id===tableId);if(!table)throw new Error('Table does not belong to this event.');if(table.table_purpose!=='head')return null;
 const existing=snapshot.guests.filter(person=>person.table_id===tableId).sort(bySeat);
 if(new Set(ids).size!==ids.length||existing.length!==ids.length||ids.some(id=>!existing.some(person=>person.id===id)))throw new Error('The guest list changed. Refresh before rearranging.');
 const reserved=reservations(table,snapshot,snapshot.guests).map(item=>item.seat);validateSeats(table,snapshot.guests,reserved);
 if(existing.some(person=>person.seat_no==null))throw new Error('Assign existing Head Table guests seat numbers before rearranging.');
 const people=snapshot.guests.map(person=>({...person}));ids.forEach((id,index)=>{people.find(person=>person.id===id)!.seat_no=existing[index].seat_no;});
 return finish(snapshot,people,new Set([tableId]));
}
