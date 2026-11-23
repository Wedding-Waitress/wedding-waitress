import { beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({owner:'owner',event:{id:'event',user_id:'owner',partner1_name:'Alex Smith',partner2_name:'Casey Jones'},tables:[] as any[],guests:[] as any[],fail:false,calls:0,allowed:true}));
class Query {
 operation='select'; payload:any; filters:Array<[string,unknown]>=[];
 constructor(public table:string){}
 select(){return this;} eq(key:string,value:unknown){this.filters.push([key,value]);return this;} in(key:string,value:unknown[]){return this.eq(key,value);}
 update(payload:any){this.operation='update';this.payload=payload;return this;}
 maybeSingle(){return this.run().then(result=>({...result,data:result.data[0]||null}));}
 then(resolve:any,reject:any){return this.run().then(resolve,reject);}
 async run(){const rows=this.table==='events'?[state.event]:this.table==='tables'?state.tables:state.guests;const data=rows.filter(row=>this.filters.every(([key,value])=>Array.isArray(value)?value.includes(row[key]):row[key]===value));if(this.operation==='update')data.forEach(row=>Object.assign(row,this.payload));return{data,error:null};}
}
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:state.owner}},error:null})},from:(table:string)=>new Query(table),rpc:async(_name:string,args:any)=>{if(_name==='can_access_event')return{data:state.allowed&&(state.owner==='owner'||state.owner==='admin'),error:null};state.calls++;if(state.fail)return{error:new Error('seating failed')};const table=state.tables.find(row=>row.id===args.p_table_id);table.head_seating_order=args.p_order;const offset=Math.floor((table.limit_seats-args.p_order.length)/2);args.p_order.forEach((entry:any,index:number)=>{if(entry.kind==='guest')Object.assign(state.guests.find(row=>row.id===entry.guest_id),{table_id:table.id,table_no:null,seat_no:offset+index+1});});return{error:null};}}}));
import { reconcileHeadTableParticipants } from './headTableParticipants';
beforeEach(()=>{state.owner='owner';state.allowed=true;state.fail=false;state.calls=0;state.tables=[{id:'head',event_id:'event',user_id:'owner',limit_seats:3,table_purpose:'head',head_seating_order:[{kind:'participant',participant:'primary_2'},{kind:'participant',participant:'primary_1'},{kind:'guest',guest_id:'child'}]}];state.guests=[{id:'one',event_id:'event',user_id:'owner',first_name:'Alex',guided_setup_origin:'wedding_couple_1',table_id:null,seat_no:null,assigned:false},{id:'two',event_id:'event',user_id:'owner',first_name:'Casey',guided_setup_origin:'wedding_couple_2',table_id:null,seat_no:null,assigned:false},{id:'child',event_id:'event',user_id:'owner',first_name:'Robin',table_id:'head',seat_no:3,assigned:true}];});
it('persists both guest assignments through one seating RPC and remains idempotent under concurrent reads',async()=>{expect(await Promise.all([reconcileHeadTableParticipants('event'),reconcileHeadTableParticipants('event')])).toEqual([true,true]);expect(state.calls).toBe(1);expect(state.guests.map(row=>[row.id,row.table_id,row.seat_no,row.assigned])).toEqual([['one','head',2,true],['two','head',1,true],['child','head',3,true]]);expect(await reconcileHeadTableParticipants('event')).toBe(false);expect(state.calls).toBe(1);});
it('does not mutate another event or another owner',async()=>{expect(await reconcileHeadTableParticipants('other')).toBe(false);state.owner='other';expect(await reconcileHeadTableParticipants('event')).toBe(false);expect(state.calls).toBe(0);expect(state.guests[0].table_id).toBeNull();});
it('propagates a seating failure without setting assignment flags and permits retry',async()=>{state.fail=true;await expect(reconcileHeadTableParticipants('event')).rejects.toThrow('seating failed');expect(state.guests[0].assigned).toBe(false);state.fail=false;expect(await reconcileHeadTableParticipants('event')).toBe(true);});

it('does not create a Head Table or assign people when the event has none', async () => {
 state.tables=[];
 expect(await reconcileHeadTableParticipants('event')).toBe(false);
 expect(state.calls).toBe(0);
 expect(state.guests[0].table_id).toBeNull();
});

it('links stable guided identities with default Bride/Groom labels for an authorised admin without renaming people',async()=>{
 state.owner='admin';state.event.partner1_name='Bride';state.event.partner2_name='Groom';
 try{expect(await reconcileHeadTableParticipants('event')).toBe(true);expect(state.guests[0]).toMatchObject({id:'one',first_name:'Alex',table_id:'head'});expect(state.guests[1]).toMatchObject({id:'two',first_name:'Casey',table_id:'head'});}finally{state.event.partner1_name='Alex Smith';state.event.partner2_name='Casey Jones';}
});
