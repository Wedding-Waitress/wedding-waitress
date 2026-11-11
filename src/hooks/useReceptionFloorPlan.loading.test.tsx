import React from 'react';import {act,cleanup,renderHook} from '@testing-library/react';import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:0,reads:0,user:{id:'owner'} as {id:string}|null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:()=>{m.auth++;return new Promise(resolve=>setTimeout(()=>resolve({data:{user:m.user}}),300));}},from:()=>({select:()=>({eq:(_k:string,id:string)=>({maybeSingle:()=>{m.reads++;return new Promise(resolve=>setTimeout(()=>resolve({data:{id:'plan-'+id,event_id:id,room_shape:'rect',room_width_m:15,room_length_m:20,grid_size_cm:50,table_positions:[],fixtures:[],vendor_notes:'Keep me',background_image_url:null},error:null}),500));}})})})}}));
import {useReceptionFloorPlan} from './useReceptionFloorPlan';import {clearAllCaches} from '@/lib/cacheRegistry';
beforeEach(()=>{vi.useFakeTimers();clearAllCaches();m.auth=0;m.reads=0;m.user={id:'owner'};});afterEach(()=>{cleanup();vi.useRealTimers();});
it('runs verified authentication and plan reading concurrently and coalesces Strict Mode requests',async()=>{
 const {result}=renderHook(()=>useReceptionFloorPlan('event'),{wrapper:({children}:React.PropsWithChildren)=><React.StrictMode>{children}</React.StrictMode>});
 expect(result.current.loading).toBe(true);await act(async()=>{await vi.advanceTimersByTimeAsync(500)});
 expect(result.current.plan?.vendor_notes).toBe('Keep me');expect(result.current.loading).toBe(false);expect(m.auth).toBe(1);expect(m.reads).toBe(1);
});
it('does not publish a plan without a verified user',async()=>{m.user=null;const {result}=renderHook(()=>useReceptionFloorPlan('event'));await act(async()=>{await vi.advanceTimersByTimeAsync(500)});expect(result.current.plan).toBeNull();expect(result.current.loadError).toBe('Please sign in again to load your floor plan.');});
