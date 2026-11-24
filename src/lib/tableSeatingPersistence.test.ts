import {beforeEach,describe,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({read:vi.fn(),persist:vi.fn()}));
vi.mock('./headTableMovePersistence',()=>({readSnapshot:mock.read,persistHeadMovePlan:mock.persist}));
import {saveTableSeating,queueTableSeating,isTableSeatingBusy} from './tableSeatingPersistence';
const snapshot=()=>({eventId:'event',ownerId:'owner',tables:[{id:'a',name:'A',event_id:'event',user_id:'owner',table_purpose:'standard',limit_seats:3,head_seating_order:[]},{id:'b',name:'B',event_id:'event',user_id:'owner',table_purpose:'standard',limit_seats:3,head_seating_order:[]}],guests:['one','two'].map((id,i)=>({id,event_id:'event',user_id:'owner',first_name:id,table_id:'a',table_no:null,seat_no:i+1,assigned:true}))});
beforeEach(()=>{mock.read.mockReset();mock.persist.mockReset();});
describe('serialized table seating writes',()=>{
  it('reads a fresh snapshot for each rapid move and waits for the previous save',async()=>{
    const state=snapshot();let release!:()=>void;const gate=new Promise<void>(r=>release=r);
    mock.read.mockImplementation(async()=>structuredClone(state));
    mock.persist.mockImplementationOnce(async p=>{await gate;p.guests.forEach(c=>Object.assign(state.guests.find(g=>g.id===c.after.id)!,c.after));}).mockImplementation(async p=>{p.guests.forEach(c=>Object.assign(state.guests.find(g=>g.id===c.after.id)!,c.after));});
    const one=saveTableSeating('event',{guestId:'one',sourceTableId:'a',destTableId:'b'});
    const two=saveTableSeating('event',{guestId:'two',sourceTableId:'a',destTableId:'b'});
    await vi.waitFor(()=>expect(mock.persist).toHaveBeenCalledTimes(1));expect(mock.read).toHaveBeenCalledTimes(1);expect(isTableSeatingBusy('event')).toBe(true);
    release();await Promise.all([one,two]);expect(state.guests.map(g=>[g.table_id,g.seat_no])).toEqual([['b',1],['b',2]]);
  });
  it('recovers the queue after a failed save and skips an event that is no longer selected',async()=>{
    await expect(queueTableSeating('failure',async()=>{throw Error('failed');})).rejects.toThrow('failed');
    expect(await queueTableSeating('failure',async()=>true)).toBe(true);
    expect(await saveTableSeating('event',{guestId:'one',sourceTableId:'a',destTableId:'b'},()=>false)).toBe(false);expect(mock.read).not.toHaveBeenCalled();
  });
});
