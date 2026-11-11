import {act,renderHook,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {useAccountBilling} from './useAccountBilling';
import {clearAllCaches} from '@/lib/cacheRegistry';
const mock=vi.hoisted(()=>({amount:199,invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:async(name:string)=>{mock.invoke(name);return {data:{lastInvoice:{amount:mock.amount,currency:'aud',date:'2026-11-06',hostedUrl:null,pdfUrl:null},history:[]},error:null};}}}}));
it('refreshes mounted account billing summaries on a confirmed entitlement event',async()=>{clearAllCaches();const view=renderHook(()=>useAccountBilling());await waitFor(()=>expect(view.result.current.loading).toBe(false));expect(view.result.current.data.lastInvoice?.amount).toBe(199);mock.amount=249;act(()=>window.dispatchEvent(new Event('ww:plan-entitlement-changed')));await waitFor(()=>expect(view.result.current.data.lastInvoice?.amount).toBe(249));expect(mock.invoke).toHaveBeenCalledTimes(2);});
