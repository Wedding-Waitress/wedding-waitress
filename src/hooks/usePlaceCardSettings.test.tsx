import {act, renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {usePlaceCardSettings} from './usePlaceCardSettings';
const m=vi.hoisted(()=>({row:null as any,inserts:0,fail:false,toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:m.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>({
 select:()=>({eq:()=>({maybeSingle:async()=>({data:m.row,error:null})})}),
 insert:(values:any)=>{m.inserts++;return{select:()=>({single:async()=>{m.row={id:'saved',...values};return{data:m.row,error:null}}})}},
 update:(values:any)=>({eq:()=>({select:()=>({single:async()=>{if(m.fail)return{data:null,error:{message:'Rejected'}};m.row={...m.row,...values};return{data:m.row,error:null}}})})})
})}}));
beforeEach(()=>{m.row=null;m.inserts=0;m.fail=false;m.toast.mockClear()});
describe('Place card saves',()=>{
 it('serializes rapid first saves without duplicate rows or lost fields',async()=>{
  const {result}=renderHook(()=>usePlaceCardSettings('qa-first-save'));
  await waitFor(()=>expect(result.current.loading).toBe(false));
  let results:boolean[]=[];
  await act(async()=>{results=await Promise.all([result.current.updateSettings({font_color:'#123456'}),result.current.updateSettings({info_font_size:18}),result.current.updateSettings({mass_message:'Welcome'})])});
  expect(results).toEqual([true,true,true]);expect(m.inserts).toBe(1);expect(m.row).toMatchObject({font_color:'#123456',info_font_size:18,mass_message:'Welcome'});
 });
 it('reports a rejected write and restores the last saved preview value',async()=>{
  m.row={id:'saved',event_id:'qa-failed-save',user_id:'owner',font_color:'#000000'};
  const {result}=renderHook(()=>usePlaceCardSettings('qa-failed-save'));
  await waitFor(()=>expect(result.current.loading).toBe(false));m.fail=true;
  let saved;await act(async()=>{saved=await result.current.updateSettings({font_color:'#ffffff'})});
  expect(saved).toBe(false);expect(result.current.settings?.font_color).toBe('#000000');
  expect(m.toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Success'}));
 });
});
