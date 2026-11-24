import {describe,it,expect} from 'vitest';
import {planMissingTableSeats,planTableMove,planTableReorder} from './tableSeatingPlan';
import type {SeatingGuest,SeatingSnapshot} from './headTableMoves';
const guest=(id:string,table_id:string|null,seat_no:number|null,extra={}):SeatingGuest=>({id,event_id:'event',user_id:'owner',first_name:id,table_id,table_no:table_id==='five'?5:2,seat_no,assigned:!!table_id,...extra});
const fixture=():SeatingSnapshot=>({eventId:'event',ownerId:'owner',tables:[{id:'two',name:'2',table_no:2,event_id:'event',user_id:'owner',table_purpose:'standard',limit_seats:10,head_seating_order:[]},{id:'five',name:'5',table_no:5,event_id:'event',user_id:'owner',table_purpose:'standard',limit_seats:10,head_seating_order:[]}],guests:[guest('moving','two',1),...Array.from({length:6},(_,i)=>guest('seated-'+i,'five',i+1)),...['Hanan','Omar','Hassan','Hayam'].map((name,i)=>guest(name,'five',null,{created_at:`2026-01-0${i+1}`}))]});
const apply=(s:SeatingSnapshot,p:ReturnType<typeof planMissingTableSeats>)=>({...s,guests:s.guests.map(g=>p.guests.find(c=>c.after.id===g.id)?.after||g)});
describe('shared standard-table seat rules',()=>{
  it('numbers existing blank seats 7 through 10 in displayed creation order without changing seats 1 through 6',()=>{
    const s=fixture(),p=planMissingTableSeats(s);
    expect(p.guests.map(c=>[c.after.first_name,c.after.seat_no])).toEqual([['Hanan',7],['Omar',8],['Hassan',9],['Hayam',10]]);
    expect(p.guests.every(c=>c.before.table_id===c.after.table_id)).toBe(true);
    expect(planMissingTableSeats(apply(s,p)).guests).toEqual([]);
  });
  it('updates each seat after a reorder, including previously blank seats',()=>{
    const s=fixture(),ids=s.guests.filter(g=>g.table_id==='five').map(g=>g.id).reverse();
    const p=planTableReorder(s,'five',ids)!;
    const next=apply(s,p);expect(ids.map(id=>next.guests.find(g=>g.id===id)?.seat_no)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
  it('uses free slots in a sparse table without ever assigning seat 11',()=>{
    const s=fixture();s.guests=s.guests.filter(g=>g.id==='moving'||g.id.startsWith('seated')).map(g=>g.table_id==='five'?{...g,seat_no:g.seat_no!+4}:g);
    const p=planTableMove(s,{guestId:'moving',sourceTableId:'two',destTableId:'five'})!,next=apply(s,p);
    const members=next.guests.filter(g=>g.table_id==='five');expect(members.every(g=>g.seat_no!<=10)).toBe(true);expect(new Set(members.map(g=>g.seat_no)).size).toBe(7);
    expect(next.guests.find(g=>g.id==='moving')?.seat_no).toBe(10);
  });
  it('does not change a full destination, a stale source, or another event',()=>{
    const s=fixture();expect(()=>planTableMove(s,{guestId:'moving',sourceTableId:'two',destTableId:'five'})).toThrow('full');
    expect(()=>planTableMove(s,{guestId:'moving',sourceTableId:null,destTableId:'five'})).toThrow('changed');
    s.guests[0].event_id='other';expect(()=>planMissingTableSeats(s)).toThrow('mismatch');
  });
});
