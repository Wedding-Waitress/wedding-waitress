import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {RoomShapePanel} from './RoomShapePanel';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
it('adds independent movable wall sections without changing room dimensions or furniture',()=>{
 let plan={room_width_m:20,room_length_m:35,grid_size_cm:50,fixtures:[],table_positions:[],room_polygon:null} as unknown as ReceptionFloorPlan;
 const onChange=(m:(p:ReceptionFloorPlan)=>ReceptionFloorPlan)=>{plan=m(plan)};
 render(<RoomShapePanel plan={plan} onChange={onChange}/>);
 expect(screen.queryByRole('button',{name:'L-shape'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Add wall section'}));
 fireEvent.click(screen.getByRole('button',{name:'Add wall section'}));
 expect(plan.fixtures).toHaveLength(2);expect(plan.fixtures[0].id).not.toBe(plan.fixtures[1].id);
 expect(plan.fixtures[0]).toMatchObject({type:'wall',width_m:.3,height_m:6,locked:false,rotation:0});
 expect(plan.room_width_m).toBe(20);expect(plan.room_length_m).toBe(35);expect(plan.grid_size_cm).toBe(50);
});
