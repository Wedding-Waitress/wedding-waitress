import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {useAdminCustomerActivity} from './useCustomerActivity';
const mock=vi.hoisted(()=>({rpc:vi.fn(),remove:vi.fn(),event:null as null|((p:any)=>void),status:null as null|((s:string)=>void)}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mock.rpc,removeChannel:mock.remove,channel:()=>{const channel={on:(_name:any,_filter:any,callback:any)=>{mock.event=callback;return channel;},subscribe:(callback:any)=>{mock.status=callback;return channel;}};return channel;}}}));
const row=(timestamp:string)=>({user_id:'fixture',last_active_at:timestamp,last_sign_in_at:null});
describe('owner customer activity subscription',()=>{
 beforeEach(()=>{mock.rpc.mockReset().mockResolvedValue({data:[],error:null});mock.remove.mockReset().mockResolvedValue(null);mock.event=null;mock.status=null;});
 it('does not contact an unprepared backend',()=>{renderHook(()=>useAdminCustomerActivity(false));expect(mock.rpc).not.toHaveBeenCalled();});
 it('renders pushed timestamps and never replaces them with older snapshots',async()=>{
  mock.rpc.mockResolvedValue({data:[row('2026-09-12T01:00:00Z')],error:null});
  const {result,unmount}=renderHook(()=>useAdminCustomerActivity(true));
  await waitFor(()=>expect(result.current.records.fixture).toBeDefined());
  act(()=>{mock.status?.('SUBSCRIBED');mock.event?.({eventType:'UPDATE',new:row('2026-09-12T02:00:00Z')});});
  await waitFor(()=>expect(result.current.records.fixture.last_active_at).toBe('2026-09-12T02:00:00Z'));
  expect(result.current.connection).toBe('live');unmount();expect(mock.remove).toHaveBeenCalledTimes(1);
 });
 it('resynchronises after reconnect and removes listeners on exit',async()=>{
  const {result,unmount}=renderHook(()=>useAdminCustomerActivity(true));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(1));
  act(()=>mock.status?.('CHANNEL_ERROR'));expect(result.current.connection).toBe('reconnecting');
  act(()=>mock.status?.('SUBSCRIBED'));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(2));
  act(()=>window.dispatchEvent(new Event('online')));await waitFor(()=>expect(mock.rpc).toHaveBeenCalledTimes(3));
  unmount();window.dispatchEvent(new Event('online'));expect(mock.rpc).toHaveBeenCalledTimes(3);
 });
 it('invalidates details only when profile metadata changes',async()=>{
  const {result}=renderHook(()=>useAdminCustomerActivity(true));await waitFor(()=>expect(mock.rpc).toHaveBeenCalled());
  const updated={...row('2026-09-12T02:00:00Z'),account_updated_at:'2026-09-12T02:00:00Z'};
  act(()=>mock.event?.({eventType:'UPDATE',new:updated}));expect(result.current.snapshotRevision).toBe(1);
  act(()=>mock.event?.({eventType:'UPDATE',new:{...updated,last_active_at:'2026-09-12T03:00:00Z'}}));expect(result.current.snapshotRevision).toBe(1);
 });
});
