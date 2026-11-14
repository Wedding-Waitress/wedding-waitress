import {renderHook,waitFor,act} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import {useUserPlan} from './useUserPlan';
import {clearAllCaches} from '@/lib/cacheRegistry';
const mock=vi.hoisted(()=>({name:'Starter',start:'2026-11-01T22:30:00Z',end:'2099-11-08T22:30:00Z',rpc:vi.fn(),select:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'fixture-owner',created_at:'2026-11-06T01:00:00Z'}}})},rpc:async(name:string)=>{mock.rpc(name);return {data:name==='has_platform_owner_access'?false:name==='get_user_plan'?[{plan_name:mock.name,guest_limit:mock.name==='Starter'?20:150,status:'active',expires_at:mock.end,is_read_only:false,team_members:1}]:null,error:null};},from:(table:string)=>{const chain:any={select:(columns:string)=>{mock.select(table,columns);return chain;},eq:()=>chain,limit:()=>chain,single:async()=>({data:table==='user_subscriptions'?{started_at:mock.start,trial_extended:false}:{table_limit:5},error:null})};return chain;}}}));
beforeEach(()=>{clearAllCaches();mock.name='Starter';mock.rpc.mockClear();mock.select.mockClear();});
it('uses the stored subscription start and expiry, never the current day or auth creation date',async()=>{const view=renderHook(()=>useUserPlan());await waitFor(()=>expect(view.result.current.loading).toBe(false));expect(view.result.current.plan?.trial_started_at).toBe(mock.start);expect(view.result.current.plan?.expires_at).toBe(mock.end);expect(mock.select).toHaveBeenCalledWith('user_subscriptions','plan_id, trial_extended, started_at');});
it('refreshes all mounted trial controls together on focus after confirmed payment',async()=>{const a=renderHook(()=>useUserPlan()),b=renderHook(()=>useUserPlan());await waitFor(()=>expect(a.result.current.loading||b.result.current.loading).toBe(false));mock.name='Premium';await act(async()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(a.result.current.plan?.plan_name).toBe('Premium'));expect(b.result.current.plan?.plan_name).toBe('Premium');});

it('notifies dependent summaries only after a changed server entitlement, not an unchanged refresh',async()=>{
 const changed=vi.fn();window.addEventListener('ww:plan-entitlement-changed',changed);const view=renderHook(()=>useUserPlan());await waitFor(()=>expect(view.result.current.loading).toBe(false));
 await act(async()=>window.dispatchEvent(new Event('focus')));expect(changed).not.toHaveBeenCalled();mock.name='Premium';await act(async()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(changed).toHaveBeenCalledTimes(1));window.removeEventListener('ww:plan-entitlement-changed',changed);
});
