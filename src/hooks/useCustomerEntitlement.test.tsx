import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCustomerEntitlement } from './useCustomerEntitlement';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,functions:{invoke:mocks.invoke}}}));
const active={status:'active',kind:'trial',server_now:'2026-09-12T00:00:00Z',expires_at:'2026-09-12T00:00:10Z'};
beforeEach(()=>{mocks.rpc.mockReset();mocks.invoke.mockReset();mocks.invoke.mockResolvedValue({data:{state:'none'},error:null});vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});});
afterEach(()=>vi.useRealTimers());
it('checks due promotion activation before asking the authoritative entitlement RPC',async()=>{
 mocks.rpc.mockResolvedValue({data:active,error:null});
 renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{});
 expect(mocks.invoke).toHaveBeenCalledWith('get-promotion-state',{body:{}});
 expect(mocks.invoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
});
it('never grants access from promotional state when entitlement denies it',async()=>{
 mocks.invoke.mockResolvedValue({data:{state:'active'},error:null});
 mocks.rpc.mockResolvedValue({data:{...active,status:'admin_blocked'},error:null});
 const {result}=renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{});
 expect(result.current.state?.status).toBe('admin_blocked');
});
it('uses ordinary entitlement when promotion lookup is unavailable',async()=>{
 mocks.invoke.mockRejectedValue(new Error('Backend unavailable'));
 mocks.rpc.mockResolvedValue({data:active,error:null});
 const {result}=renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{});
 expect(result.current.state?.status).toBe('active');
});
it('does not request an uninstalled backend when its release gate is disabled',()=>{
 const {result}=renderHook(()=>useCustomerEntitlement('user',false));
 expect(result.current.checking).toBe(false);expect(mocks.rpc).not.toHaveBeenCalled();
});
it('expires by server time and monotonic elapsed time despite browser clock changes',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:active,error:null}).mockResolvedValue({data:{...active,status:'trial_expired',server_now:active.expires_at},error:null});
 const {result}=renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{});
 expect(result.current.state?.status).toBe('active');
 vi.setSystemTime(new Date('2000-01-01'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
 expect(result.current.state?.status).toBe('trial_expired');
 expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
it('fails closed on a missing or malformed decision and revalidates on reconnect',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'PGRST202'}}).mockResolvedValue({data:active,error:null});
 const {result}=renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{});expect(result.current.error).toBe(true);expect(result.current.state).toBeNull();
 await act(async()=>{window.dispatchEvent(new Event('online'));});
 expect(result.current.error).toBe(false);expect(result.current.state?.status).toBe('active');
});
it('hides the previous account decision when authenticated identity changes',async()=>{
 mocks.rpc.mockResolvedValueOnce({data:active,error:null}).mockImplementation(()=>new Promise(()=>{}));
 const {result,rerender}=renderHook(({id})=>useCustomerEntitlement(id,true),{initialProps:{id:'first'}});
 await act(async()=>{});expect(result.current.state?.status).toBe('active');
 rerender({id:'second'});expect(result.current.state).toBeNull();expect(result.current.checking).toBe(true);
});
it('fails closed after a hung request and ignores its late response before a safe retry',async()=>{
 let lateResolve:(value:unknown)=>void=()=>{};
 mocks.rpc.mockImplementationOnce(()=>new Promise(resolve=>{lateResolve=resolve;})).mockResolvedValue({data:active,error:null});
 const {result}=renderHook(()=>useCustomerEntitlement('user',true));
 await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});
 expect(result.current.checking).toBe(false);expect(result.current.error).toBe(true);expect(result.current.state).toBeNull();
 await act(async()=>{lateResolve({data:active,error:null});});
 expect(result.current.state).toBeNull();
 await act(async()=>{result.current.refresh();});
 expect(result.current.error).toBe(false);expect(result.current.state?.status).toBe('active');
});
