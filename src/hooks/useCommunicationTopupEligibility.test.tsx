import { readFileSync } from 'node:fs';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunicationTopupEligibility } from './useCommunicationTopupEligibility';
import { useSmsTopup } from './useSmsTopup';
import { COMMUNICATION_TOPUP_PLAN_IDS, TOPUP_PLAN_REQUIRED, isCommunicationTopupSubscriptionCurrent } from '@/lib/communicationTopupEligibility';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), invoke: vi.fn(), toast: vi.fn(), start: vi.fn(), stop: vi.fn(), authChanged: undefined as undefined | (()=>void) }));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:mocks.getUser,onAuthStateChange:(callback:()=>void)=>{mocks.authChanged=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};}},from:mocks.from,functions:{invoke:mocks.invoke}}}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock('@/contexts/PaymentProcessingContext',()=>({usePaymentProcessing:()=>({processing:false,startProcessing:mocks.start,stopProcessing:mocks.stop})}));
let subscription: {plan_id:string;status:string;expires_at:string|null;is_read_only:boolean|null}|null;
let ownsEvent=true;
let readError=false;
beforeEach(()=>{
 vi.clearAllMocks(); ownsEvent=true;readError=false;
 subscription={plan_id:[...COMMUNICATION_TOPUP_PLAN_IDS][0],status:'active',expires_at:null,is_read_only:false};
 mocks.getUser.mockResolvedValue({data:{user:{id:'owner'}},error:null});
 mocks.from.mockImplementation((table:string)=>{
   const query={select:vi.fn(()=>query),eq:vi.fn(()=>query),in:vi.fn(()=>query),order:vi.fn(()=>query),limit:vi.fn(()=>query),maybeSingle:vi.fn(async()=>({data:table==='events'?(ownsEvent?{id:'event'}:null):subscription,error:readError?{message:'Unavailable'}:null}))};
   return query;
 });
 mocks.invoke.mockResolvedValue({data:null,error:{message:'Denied',context:new Response(JSON.stringify({error:TOPUP_PLAN_REQUIRED}),{status:403})}});
});
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('purchase entitlement matches checkout policy',()=>{
 it.each([...COMMUNICATION_TOPUP_PLAN_IDS])('accepts actual paid subscription %s',id=>expect(isCommunicationTopupSubscriptionCurrent({...subscription!,plan_id:id})).toBe(true));
 it.each(['active','trialing','grace_period'])('accepts current %s status',status=>expect(isCommunicationTopupSubscriptionCurrent({...subscription!,status})).toBe(true));
 it.each(['expired','cancelled','pending','paused'])('rejects %s status',status=>expect(isCommunicationTopupSubscriptionCurrent({...subscription!,status})).toBe(false));
 it('does not treat owner access, Starter, read-only or expired plans as a purchase entitlement',()=>{
   expect(isCommunicationTopupSubscriptionCurrent(null)).toBe(false);
   for(const plan_id of ['platform_owner','starter']) expect(isCommunicationTopupSubscriptionCurrent({...subscription!,plan_id})).toBe(false);
   expect(isCommunicationTopupSubscriptionCurrent({...subscription!,is_read_only:true})).toBe(false);
   expect(isCommunicationTopupSubscriptionCurrent({...subscription!,expires_at:'2020-01-01'})).toBe(false);
   expect(isCommunicationTopupSubscriptionCurrent({...subscription!,expires_at:'invalid'})).toBe(false);
 });
 it('starts unknown, checks ownership, and fails closed with retry on read error',async()=>{
   readError=true;
   const {result}=renderHook(()=>useCommunicationTopupEligibility('event'));
   expect(result.current.eligibility.status).toBe('loading');
   await waitFor(()=>expect(result.current.eligibility.status).toBe('error'));
   readError=false;ownsEvent=false;
   await act(async()=>{await result.current.refresh();});
   expect(result.current.eligibility.message).toMatch(/Only the event owner/);
   ownsEvent=true;
   await act(async()=>{await result.current.refresh();});
   expect(result.current.eligibility.status).toBe('eligible');
 });
 it('ignores an old event response while the new event remains ineligible',async()=>{
   let resolveFirst!: (value:unknown)=>void;
   mocks.getUser.mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve;}));
   const view=renderHook(({eventId})=>useCommunicationTopupEligibility(eventId),{initialProps:{eventId:'old'}});
   subscription=null;view.rerender({eventId:'new'});
   await waitFor(()=>expect(view.result.current.eligibility.status).toBe('ineligible'));
   await act(async()=>{resolveFirst({data:{user:{id:'owner'}},error:null});});
   expect(view.result.current.eligibility.status).toBe('ineligible');
 });
 it('invalidates eligibility immediately when the account changes',async()=>{
   const {result}=renderHook(()=>useCommunicationTopupEligibility('event'));
   await waitFor(()=>expect(result.current.eligibility.status).toBe('eligible'));
   subscription=null;
   act(()=>mocks.authChanged!());
   expect(result.current.eligibility.status).toBe('loading');
   await waitFor(()=>expect(result.current.eligibility.status).toBe('ineligible'));
 });
 it('times out an unavailable eligibility service without enabling checkout',async()=>{
   vi.useFakeTimers();mocks.getUser.mockReturnValue(new Promise(()=>{}));
   const {result}=renderHook(()=>useCommunicationTopupEligibility('event'));
   await act(async()=>{await vi.advanceTimersByTimeAsync(15001);});
   expect(result.current.eligibility.status).toBe('error');
 });
 it('rechecks a previously eligible subscription before invoking checkout',async()=>{
   const {result}=renderHook(()=>useSmsTopup('event'));
   await waitFor(()=>expect(result.current.eligibility.status).toBe('eligible'));
   subscription=null;
   await act(async()=>{await result.current.startTopup('event');});
   expect(mocks.invoke).not.toHaveBeenCalled();
   expect(mocks.start).not.toHaveBeenCalled();
   expect(result.current.eligibility.status).toBe('ineligible');
   expect(result.current.loading).toBe(false);
 });
 it('honours a server denial, clears processing, and sends the selected pack once',async()=>{
   const {result}=renderHook(()=>useSmsTopup('event'));
   await waitFor(()=>expect(result.current.eligibility.status).toBe('eligible'));
   await act(async()=>{await Promise.all([result.current.startTopup('event','credits_10'),result.current.startTopup('event','credits_10')]);});
   expect(mocks.invoke).toHaveBeenCalledTimes(1);
   expect(mocks.invoke).toHaveBeenCalledWith('create-checkout',{body:expect.objectContaining({event_id:'event',purchase_type:'communication_topup',communication_topup_pack:'credits_10',idempotency_key:expect.any(String)})});
   expect(result.current.eligibility).toEqual({status:'ineligible',message:TOPUP_PLAN_REQUIRED});
   expect(result.current.loading).toBe(false);expect(mocks.stop).toHaveBeenCalled();
   expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({description:TOPUP_PLAN_REQUIRED}));
 });
});

it('keeps the client paid-plan allowlist aligned with checkout',()=>{
 const source=readFileSync('supabase/functions/create-checkout/index.ts','utf8');
 const backend=source.slice(source.indexOf('const PAID_WEDDING_PLAN_IDS'),source.indexOf('const ADDITIONAL_EVENT_PRICES'));
 const ids=backend.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
 expect(ids?.sort()).toEqual([...COMMUNICATION_TOPUP_PLAN_IDS].sort());
});
it('does not start checkout when the event changes during its eligibility preflight',async()=>{
 const view=renderHook(({eventId})=>useSmsTopup(eventId),{initialProps:{eventId:'old'}});
 await waitFor(()=>expect(view.result.current.eligibility.status).toBe('eligible'));
 let finish!: (value:unknown)=>void;
 mocks.getUser.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 let pending!: Promise<void>;
 act(()=>{pending=view.result.current.startTopup('old');});
 view.rerender({eventId:'new'});
 await waitFor(()=>expect(view.result.current.eligibility.status).toBe('eligible'));
 await act(async()=>{finish({data:{user:{id:'owner'}},error:null});await pending;});
 expect(mocks.invoke).not.toHaveBeenCalled();
 expect(view.result.current.loading).toBe(false);
});
