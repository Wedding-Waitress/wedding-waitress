import {act,renderHook} from '@testing-library/react';
import {expect,it} from 'vitest';
import {useReceptionLayoutHistory,resetReceptionLayout} from './useReceptionLayoutHistory';
import type {ReceptionFloorPlan} from './useReceptionFloorPlan';
import type {ReceptionTable} from './useReceptionTables';
const tables=[{id:'1',table_no:1,table_purpose:'standard',table_type:'round',limit_seats:8,guest_count:4,occupied_seat_numbers:[1,2,3,4],head_seating_order:[]} as ReceptionTable];
const initial=()=>({id:'p',event_id:'e',room_width_m:25,room_length_m:40,grid_size_cm:100,room_polygon:null,room_shape:'rect',table_positions:[{table_id:'1',x:5,y:6,rotation:0,locked:false,note:'Keep note'}],fixtures:[],background:{path:null},vendor_notes:'Keep vendor note',share_enabled:true} as ReceptionFloorPlan);
it('undoes multiple movements and a reset without a confirmation step',()=>{
 let p=initial();const commit=(m:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>{p=m(p)};
 const {result}=renderHook(()=>useReceptionLayoutHistory('e',commit,tables));
 const move=(x:number)=>act(()=>result.current.update(p=>({...p,table_positions:p.table_positions.map(t=>({...t,x}))})));
 move(8);move(10);expect(result.current.canUndo).toBe(true);
 act(()=>result.current.undo());expect(p.table_positions[0].x).toBe(8);
 act(()=>result.current.update(p=>resetReceptionLayout(p,tables)));expect(p.room_width_m).toBe(20);expect(p.room_length_m).toBe(35);expect(p.grid_size_cm).toBe(50);expect(p.fixtures).toHaveLength(10);expect(p.table_positions[0].note).toBe('Keep note');
 act(()=>result.current.undo());expect(p.room_width_m).toBe(25);expect(p.table_positions[0].x).toBe(8);
 act(()=>result.current.undo());expect(p.table_positions[0].x).toBe(5);expect(result.current.canUndo).toBe(false);expect(p.vendor_notes).toBe('Keep vendor note');expect(p.share_enabled).toBe(true);
});
it('does not carry undo history into another event or count unchanged updates',()=>{
 let p=initial();const commit=(m:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>{p=m(p)};
 const {result,rerender}=renderHook(({event})=>useReceptionLayoutHistory(event,commit,tables),{initialProps:{event:'e'}});
 act(()=>result.current.update(p=>({...p})));expect(result.current.canUndo).toBe(false);
 act(()=>result.current.update(p=>({...p,room_width_m:30})));expect(result.current.canUndo).toBe(true);
 rerender({event:'another'});expect(result.current.canUndo).toBe(false);act(()=>result.current.undo());expect(p.room_width_m).toBe(30);
});
it('undo uses current seating counts and does not restore a deleted background upload',()=>{
 let p=initial();const commit=(m:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>{p=m(p)};
 const {result,rerender}=renderHook(({currentTables})=>useReceptionLayoutHistory('e',commit,currentTables),{initialProps:{currentTables:tables}});
 act(()=>result.current.update(p=>({...p,room_width_m:30})));p={...p,background:{...p.background,path:'new-upload'}};
 rerender({currentTables:[{...tables[0],guest_count:7}]});act(()=>result.current.undo());expect(p.table_positions[0].occupied_count).toBe(7);expect(p.background.path).toBe('new-upload');
});
