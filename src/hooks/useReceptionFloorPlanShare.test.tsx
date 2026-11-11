import React from 'react';
import {renderHook,waitFor,act,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({invoke:vi.fn(),rpc:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},rpc:mocks.rpc}}));
import {useReceptionFloorPlanShare} from './useReceptionFloorPlanShare';
const payload={kind:'reception',permission:'can_edit',draft:{payload:{vendor_notes:'Keep these notes'},revision:3,status:'draft'},backgroundUrl:'/full-quality-image.png',plan:{id:'plan',event_id:'event',room_width_m:12,room_length_m:15,updated_at:'2026-10-11',background_image_url:'original.png',background_x:2,background_y:3,background_width:8,background_height:9,background_rotation:20,background_opacity:.7,background_visible:true,fixtures:[],table_positions:[{table_id:'table',table_name:'Family',table_type:'round',capacity:8,occupied_count:2,occupied_seat_numbers:[1,4]}]},event:{name:'Wedding',date:'2026-10-20',venue:'Venue'},tables:[{id:'table',name:'Family',table_no:1,table_type:'round',limit_seats:8,guest_count:2,occupied_seat_numbers:[1,4]}]};
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('loads a new recipient link once under Strict Mode and preserves settings and original image URL',async()=>{
 mocks.invoke.mockResolvedValue({data:payload,error:null});
 const {result}=renderHook(()=>useReceptionFloorPlanShare('e'.repeat(64)),{wrapper:({children}:React.PropsWithChildren)=><React.StrictMode>{children}</React.StrictMode>});
 await waitFor(()=>expect(result.current.loading).toBe(false));
 expect(mocks.invoke).toHaveBeenCalledTimes(1);expect(mocks.rpc).not.toHaveBeenCalled();
 expect(result.current.backgroundUrl).toBe('/full-quality-image.png');
 expect(result.current.data?.permission).toBe('can_edit');expect(result.current.data?.draft?.revision).toBe(3);
 expect(result.current.data?.plan.background).toMatchObject({x:2,y:3,width:8,height:9,rotation:20,opacity:.7,visible:true});
 expect(result.current.data?.tables[0]).toMatchObject({guest_count:2,occupied_seat_numbers:[1,4]});
});
it('does not show an old plan when navigating to a different token',async()=>{
 let resolveOld!:(v:any)=>void;mocks.invoke.mockImplementationOnce(()=>new Promise(r=>resolveOld=r)).mockResolvedValueOnce({data:{...payload,event:{name:'New event'}},error:null});
 const {result,rerender}=renderHook(({token})=>useReceptionFloorPlanShare(token),{initialProps:{token:'f'.repeat(64)}});
 rerender({token:'1'.repeat(64)});await waitFor(()=>expect(result.current.data?.event.name).toBe('New event'));
 await act(async()=>resolveOld({data:payload,error:null}));expect(result.current.data?.event.name).toBe('New event');
});
it('ends loading after a transport failure and rejects a wrong-kind payload',async()=>{
 mocks.invoke.mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({data:{...payload,kind:'ceremony'},error:null});
 const {result,rerender}=renderHook(({token})=>useReceptionFloorPlanShare(token),{initialProps:{token:'2'.repeat(64)}});
 await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.error).toBeTruthy();expect(result.current.data).toBeNull();
 rerender({token:'3'.repeat(64)});await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.data).toBeNull();expect(result.current.error).toBeTruthy();
});
