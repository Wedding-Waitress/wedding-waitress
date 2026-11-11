import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke}}}));
import {useTeamAccess,previewTeamInvitation,acceptTeamInvitation} from './useTeamAccess';
describe('Team readiness and account roster',()=>{
 beforeEach(()=>vi.clearAllMocks());
 afterEach(()=>vi.useRealTimers());
 const roster={members:[{id:'owner'}],invitations:[{id:'pending'}],seats:{occupied:1,reserved:1,used:2,maximum:5,remaining:3}};
 const deferred=()=>{let resolve!:(value:any)=>void;const promise=new Promise<any>(r=>resolve=r);return{promise,resolve};};
 const load=()=>mocks.invoke.mockImplementation(async(_name,{body})=>({data:body.action==='readiness'?{ready:true,version:2}:roster,error:null}));
 it('keeps loaded data ready while focus refresh is pending and coalesces overlapping refreshes',async()=>{
  load();const {result}=renderHook(()=>useTeamAccess());await waitFor(()=>expect(result.current.hasData).toBe(true));
  const pending=deferred();mocks.invoke.mockImplementation(()=>pending.promise);
  act(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));void result.current.refresh();});
  expect(result.current.loading).toBe(false);expect(result.current.refreshing).toBe(true);expect(result.current.ready).toBe(true);
  expect(result.current.invitations).toHaveLength(1);expect(mocks.invoke).toHaveBeenCalledTimes(3);
  await act(async()=>pending.resolve({data:{ready:true,version:2},error:null}));
  await waitFor(()=>expect(result.current.refreshing).toBe(false));
 });
 it('does not return to the initial loading screen on a 60-second poll',async()=>{
  vi.useFakeTimers();
  load();const {result,unmount}=renderHook(()=>useTeamAccess());await act(async()=>{});expect(result.current.hasData).toBe(true);
  const pending=deferred();mocks.invoke.mockImplementation(()=>pending.promise);
  act(()=>vi.advanceTimersByTime(60_000));
  expect(result.current.refreshing).toBe(true);expect(result.current.loading).toBe(false);expect(result.current.seats.remaining).toBe(3);
  unmount();await act(async()=>pending.resolve({data:{ready:true,version:2},error:null}));
 });
 it('retains the last roster on a transient failure, disables readiness, and recovers on retry',async()=>{
  load();const {result}=renderHook(()=>useTeamAccess());await waitFor(()=>expect(result.current.hasData).toBe(true));
  mocks.invoke.mockResolvedValue({data:null,error:{message:'Network unavailable'}});
  await act(async()=>{await result.current.refresh();});
  expect(result.current.hasData).toBe(true);expect(result.current.ready).toBe(false);expect(result.current.error).toBeTruthy();expect(result.current.invitations).toHaveLength(1);
  load();await act(async()=>{await result.current.refresh();});
  expect(result.current.ready).toBe(true);expect(result.current.error).toBeNull();
 });
 it.each([401,403])('clears private details after HTTP %s rather than retaining stale access',async status=>{
  load();const {result}=renderHook(()=>useTeamAccess());await waitFor(()=>expect(result.current.hasData).toBe(true));
  mocks.invoke.mockImplementation(async(_name,{body})=>body.action==='readiness'?{data:{ready:true,version:2},error:null}:{data:null,error:{message:'Access denied',context:{status}}});
  await act(async()=>{await result.current.refresh();});
  expect(result.current.hasData).toBe(false);expect(result.current.members).toEqual([]);expect(result.current.invitations).toEqual([]);expect(result.current.ready).toBe(false);
 });
 it('blocks all invitation actions against an old or unavailable backend',async()=>{
  mocks.invoke.mockResolvedValue({data:{error:'Invalid team action'},error:null});
  const {result}=renderHook(()=>useTeamAccess());
  await waitFor(()=>expect(result.current.loading).toBe(false));
  expect(result.current.ready).toBe(false); expect(result.current.seats.remaining).toBe(0);
  await expect(previewTeamInvitation()).rejects.toThrow('not ready');
  await expect(acceptTeamInvitation()).rejects.toThrow('not ready');
  await expect(result.current.invite({firstName:'A',lastName:'B',email:'test@test.invalid',mobile:'+61400000000'})).rejects.toThrow('not ready');
  expect(mocks.invoke.mock.calls.every(([,options])=>options.body.action==='readiness')).toBe(true);
 });
 it('loads accurate occupied and reserved seats and refreshes when focused',async()=>{
  mocks.invoke.mockImplementation(async(_name,{body})=>({data:body.action==='readiness'?{ready:true,version:2}:{members:[{id:'owner'}],invitations:[{id:'pending'}],seats:{occupied:1,reserved:1,used:2,maximum:5,remaining:3}},error:null}));
  const {result}=renderHook(()=>useTeamAccess());
  await waitFor(()=>expect(result.current.ready).toBe(true));
  expect(result.current.seats).toMatchObject({occupied:1,reserved:1,remaining:3});
  await act(async()=>{window.dispatchEvent(new Event('focus'));});
  await waitFor(()=>expect(mocks.invoke.mock.calls.filter(([,o])=>o.body.action==='list')).toHaveLength(2));
 });
});
