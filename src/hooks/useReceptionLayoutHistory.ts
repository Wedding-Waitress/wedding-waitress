import {useCallback,useRef,useState} from 'react';
import type {ReceptionFloorPlan} from './useReceptionFloorPlan';
import type {ReceptionTable} from './useReceptionTables';
import {reconcileReceptionFloorPlan} from '@/lib/receptionFloorPlanSync';
import {RECEPTION_DEFAULT_ROOM,createReceptionDefaultFixtures} from '@/lib/receptionDefaultLayout';
type Mutator=(p:ReceptionFloorPlan)=>ReceptionFloorPlan;
const snapshot=(p:ReceptionFloorPlan)=>structuredClone({manual_placement:p.manual_placement,room_width_m:p.room_width_m,room_length_m:p.room_length_m,grid_size_cm:p.grid_size_cm,room_shape:p.room_shape,room_polygon:p.room_polygon,table_positions:p.table_positions.map(({note,...position})=>position),fixtures:p.fixtures,background:p.background});
type Snapshot=ReturnType<typeof snapshot>;
export function resetReceptionLayout(p:ReceptionFloorPlan,tables:ReceptionTable[]):ReceptionFloorPlan {
 const next=reconcileReceptionFloorPlan({...p,manual_placement:false,room_width_m:RECEPTION_DEFAULT_ROOM.width,room_length_m:RECEPTION_DEFAULT_ROOM.length,grid_size_cm:RECEPTION_DEFAULT_ROOM.grid,room_shape:'rect',room_polygon:null,table_positions:[],fixtures:createReceptionDefaultFixtures()},tables);
 // Notes belong to the event, even when its furniture is rearranged.
 next.table_positions=next.table_positions.map(t=>({...t,note:p.table_positions.find(old=>old.table_id===t.table_id)?.note}));
 return next;
}
export function useReceptionLayoutHistory(eventId:string,commit:(m:Mutator)=>void,tables:ReceptionTable[]){
 const history=useRef<{eventId:string;entries:Snapshot[]}>({eventId,entries:[]});
 const [count,setCount]=useState(0);
 if(history.current.eventId!==eventId)history.current={eventId,entries:[]};
 const update=useCallback((mutator:Mutator)=>{
  commit(p=>{const next=mutator(p);if(JSON.stringify(snapshot(p))!==JSON.stringify(snapshot(next))){history.current.entries.push(snapshot(p));setCount(history.current.entries.length);}return next;});
 },[commit,eventId]);
 const undo=useCallback(()=>{
  const previous=history.current.entries.pop();if(!previous)return;
  setCount(history.current.entries.length);
  commit(p=>reconcileReceptionFloorPlan({...p,...previous,
   // Never revive a replaced/deleted upload or roll back seating changes.
   background:p.background.path===previous.background.path?previous.background:p.background,
   table_positions:previous.table_positions.map(t=>({...t,note:p.table_positions.find(now=>now.table_id===t.table_id)?.note}))},tables));
 },[commit,tables,eventId]);
 return {update,undo,canUndo:history.current.entries.length>0&&count>0};
}
