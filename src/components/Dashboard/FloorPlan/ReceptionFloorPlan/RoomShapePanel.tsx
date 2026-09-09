import {BrickWall,Plus} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
interface Props {plan:ReceptionFloorPlan;onChange:(mutator:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>void;}
export const RoomShapePanel=({plan,onChange}:Props)=>{
 const addWall=()=>onChange(p=>({...p,room_polygon:null,fixtures:[...p.fixtures,{id:crypto.randomUUID(),type:'wall',x:p.room_width_m/2,y:p.room_length_m/2,width_m:.3,height_m:Math.min(6,p.room_length_m),rotation:0,locked:false}]}));
 return <div data-reception-panel="true" className="flex h-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 max-lg:p-4">
 <div className="flex items-center gap-2"><BrickWall className="w-4 h-4 text-primary"/><h3 className="text-sm font-semibold text-foreground">Room Walls</h3></div>
 <p className="text-xs text-muted-foreground">Shape your room with movable wall sections. Add as many as you need.</p>
 <Button type="button" variant="outline" className="lv-premium-shade h-10" onClick={addWall}><Plus className="mr-1.5 h-4 w-4"/>Add wall section</Button>
 <p className="text-xs text-muted-foreground">Drag to move. Select a wall to stretch its ends, rotate, lock or remove it. Undo steps back; Reset layout restores the default room.</p>
 <p className="mt-auto text-xs text-muted-foreground">{plan.fixtures.filter(f=>f.type==='wall').length} wall sections placed</p>
 </div>;
};
