import {act,renderHook,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import {useCeremonyFloorPlan} from './useCeremonyFloorPlan';
const m=vi.hoisted(()=>({rows:{} as Record<string,any>,fail:false,writes:[] as any[],active:0,max:0,toast:vi.fn()}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:m.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>({
 select:()=>({eq:(_k:string,id:string)=>({maybeSingle:async()=>({data:m.rows[id]??null,error:null})})}),
 update:(patch:any)=>{let id='';const chain:any={eq:(k:string,v:string)=>{if(k==='event_id')id=v;return chain},select:()=>chain,single:async()=>{m.active++;m.max=Math.max(m.max,m.active);m.writes.push(patch);await new Promise(r=>setTimeout(r,5));m.active--;if(m.fail)return{data:null,error:new Error('Rejected')};m.rows[id]={...m.rows[id],...patch};return{data:{id:m.rows[id].id},error:null}}};return chain}
})}}));
beforeEach(()=>{m.rows={};m.fail=false;m.writes=[];m.active=0;m.max=0;m.toast.mockClear()});
const plan=(id:string)=>({id:'plan-'+id,event_id:id,person_left_name:'Groom',person_right_name:'Bride',seat_assignments:[],bridal_party_left:[],bridal_party_right:[],bridal_party_roles_left:[],bridal_party_roles_right:[]});
it('serialises rapid saves and preserves the last value',async()=>{
 m.rows['ordered']=plan('ordered');const {result}=renderHook(()=>useCeremonyFloorPlan('ordered'));await waitFor(()=>expect(result.current.floorPlan).not.toBeNull());
 await act(async()=>{await Promise.all([result.current.updateFloorPlan({person_left_name:'A'}),result.current.updateFloorPlan({person_left_name:'AB'}),result.current.updateFloorPlan({person_right_name:'C'})])});
 expect(m.max).toBe(1);expect(m.rows.ordered).toMatchObject({person_left_name:'AB',person_right_name:'C'});
});
it('restores confirmed values when consecutive saves fail',async()=>{
 m.rows['failed']=plan('failed');const {result}=renderHook(()=>useCeremonyFloorPlan('failed'));await waitFor(()=>expect(result.current.floorPlan).not.toBeNull());m.fail=true;
 await act(async()=>{await Promise.all([result.current.updateFloorPlan({person_left_name:'A'}),result.current.updateFloorPlan({person_left_name:'AB'})])});
 expect(result.current.floorPlan?.person_left_name).toBe('Groom');expect(m.toast).toHaveBeenCalled();
});
it('never reuses one event plan for another event',async()=>{
 m.rows['first']=plan('first');m.rows['second']=plan('second');const {result,rerender}=renderHook(({id})=>useCeremonyFloorPlan(id),{initialProps:{id:'first'}});await waitFor(()=>expect(result.current.floorPlan?.event_id).toBe('first'));
 rerender({id:'second'});expect(result.current.floorPlan?.event_id).not.toBe('first');await waitFor(()=>expect(result.current.floorPlan?.event_id).toBe('second'));
 rerender({id:'first'});await waitFor(()=>expect(result.current.floorPlan?.event_id).toBe('first'));
});
it('keeps consecutive seat edits before a rerender',async()=>{
 m.rows['seats']=plan('seats');const {result}=renderHook(()=>useCeremonyFloorPlan('seats'));await waitFor(()=>expect(result.current.floorPlan).not.toBeNull());
 await act(async()=>{await Promise.all([result.current.updateSeatAssignment('left',1,1,'First'),result.current.updateSeatAssignment('left',1,2,'Second')])});
 expect(result.current.floorPlan?.seat_assignments).toHaveLength(2);
});
