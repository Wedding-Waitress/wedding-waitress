import {planHeadTableMove,planHeadTableReorder,type SeatingGuest,type SeatingSnapshot,type HeadMove,type HeadMovePlan} from './headTableMoves';

type OrderedGuest=Pick<SeatingGuest,'seat_no'> & {display_order?:number|null;created_at?:string};
/** Match the table cards: numbered seats, then saved display/creation order. */
export function compareTableGuests(a:OrderedGuest,b:OrderedGuest):number {
  const aSeat=a.seat_no!=null,bSeat=b.seat_no!=null;
  if(aSeat&&bSeat)return a.seat_no!-b.seat_no!;
  if(aSeat!==bSeat)return aSeat?-1:1;
  if(a.display_order!=null&&b.display_order!=null)return a.display_order-b.display_order;
  if((a.display_order!=null)!==(b.display_order!=null))return a.display_order!=null?-1:1;
  return (a.created_at||'').localeCompare(b.created_at||'');
}
function assertScope(s:SeatingSnapshot){
  if(s.guests.some(g=>g.event_id!==s.eventId||g.user_id!==s.ownerId)||s.tables.some(t=>t.event_id!==s.eventId||t.user_id!==s.ownerId))throw Error('Event/account seating mismatch.');
}
function slots(s:SeatingSnapshot,tableId:string,people:SeatingGuest[]){
  const table=s.tables.find(t=>t.id===tableId);if(!table)throw Error('Table does not belong to this event.');
  if(people.length>table.limit_seats)throw Error('This table is full.');
  const used=people.flatMap(g=>g.seat_no==null?[]:[g.seat_no]);
  if(used.some(n=>!Number.isInteger(n)||n<1||n>table.limit_seats)||new Set(used).size!==used.length)throw Error('This table has conflicting seat numbers. Refresh before rearranging.');
  const free=Array.from({length:table.limit_seats},(_,i)=>i+1).filter(n=>!used.includes(n));
  return {table,used,free};
}
function changes(s:SeatingSnapshot,people:SeatingGuest[]):HeadMovePlan {
  return {eventId:s.eventId,ownerId:s.ownerId,heads:[],guests:people.flatMap(after=>{
    const before=s.guests.find(g=>g.id===after.id)!;
    return ['table_id','table_no','seat_no','assigned'].some(key=>before[key]!==after[key])?[{before,after}]:[];
  })};
}
/** Fill missing seats only; retain every existing valid seat and list order. */
export function planMissingTableSeats(s:SeatingSnapshot,displayedGuestIds:string[]=[]):HeadMovePlan {
  assertScope(s);const people=s.guests.map(g=>({...g}));
  const position=new Map(displayedGuestIds.map((id,index)=>[id,index]));
  for(const table of s.tables.filter(t=>t.table_purpose!=='head')){
    const members=people.filter(g=>g.table_id===table.id).sort((a,b)=>compareTableGuests(a,b)||(position.get(a.id)??Infinity)-(position.get(b.id)??Infinity));
    if(!members.some(g=>g.seat_no==null))continue;
    const {free}=slots(s,table.id,members);
    for(const guest of members){if(guest.seat_no==null){guest.seat_no=free.shift()!;guest.assigned=true;}}
  }
  return changes(s,people);
}
export function planTableMove(s:SeatingSnapshot,move:HeadMove):HeadMovePlan|null {
  assertScope(s);
  const headPlan=planHeadTableMove(s,move);if(headPlan)return headPlan;
  const original=s.guests.find(g=>g.id===move.guestId);
  if(!original||original.table_id!==move.sourceTableId)throw Error('Guest seating changed. Refresh and try again.');
  if(move.destTableId===move.sourceTableId)return null;
  const people=s.guests.map(g=>({...g})),moving=people.find(g=>g.id===move.guestId)!;
  moving.table_id=move.destTableId;moving.table_no=null;moving.seat_no=null;moving.assigned=!!move.destTableId;
  if(move.destTableId){
    const existing=people.filter(g=>g.id!==moving.id&&g.table_id===move.destTableId).sort(compareTableGuests);
    const {table,used,free}=slots(s,move.destTableId,existing);
    if(existing.length>=table.limit_seats)throw Error('This table is full.');
    const seatSlots=[...used];
    for(const guest of existing)if(guest.seat_no==null)seatSlots.push(free.shift()!);
    const index=Math.max(0,Math.min(move.insertAtIndex??existing.length,existing.length));
    const desired=existing[index]?.seat_no??Math.max(0,...seatSlots)+1;
    const extra=free.find(n=>n>=desired)??free.at(-1)!;
    seatSlots.push(extra);seatSlots.sort((a,b)=>a-b);
    existing.splice(index,0,moving);
    existing.forEach((guest,i)=>{guest.seat_no=seatSlots[i];guest.assigned=true;});
    moving.table_no=table.table_no??null;
  }
  return changes(s,people);
}
export function planTableReorder(s:SeatingSnapshot,tableId:string,ids:string[]):HeadMovePlan|null {
  assertScope(s);const table=s.tables.find(t=>t.id===tableId);
  if(!table)throw Error('Table does not belong to this event.');
  if(table.table_purpose==='head')return planHeadTableReorder(s,tableId,ids);
  const members=s.guests.filter(g=>g.table_id===tableId).sort(compareTableGuests);
  if(new Set(ids).size!==ids.length||ids.length!==members.length||ids.some(id=>!members.some(g=>g.id===id)))throw Error('The guest list changed. Refresh before rearranging.');
  slots(s,tableId,members);
  const people=s.guests.map(g=>({...g}));
  // Explicit reordering defines the seating order, including legacy blank seats.
  ids.forEach((id,index)=>{const guest=people.find(g=>g.id===id)!;guest.seat_no=index+1;guest.assigned=true;});
  return changes(s,people);
}
