import {expect,it} from 'vitest';
import {autoArrangeReception} from './receptionAutoLayout';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import type {ReceptionTable} from '@/hooks/useReceptionTables';
const table=(id:string)=>({id,table_type:'round',limit_seats:8} as ReceptionTable);
const base={room_width_m:30,room_length_m:30,room_polygon:null,fixtures:[],table_positions:[]} as unknown as ReceptionFloorPlan;
it('preserves notes and locked table positions',()=>{const plan={...base,table_positions:[{table_id:'a',x:5,y:5,rotation:15,locked:true,note:'Accessible'},{table_id:'b',x:15,y:15,rotation:0,locked:false,note:'Family'}]};const result=autoArrangeReception(plan,[table('a'),table('b')]);expect(result.positions.find(p=>p.table_id==='a')).toEqual(plan.table_positions[0]);expect(result.positions.find(p=>p.table_id==='b')?.note).toBe('Family')});
it('does not duplicate a table already linked to a fixture',()=>{const plan={...base,fixtures:[{id:'f',type:'bridal_table',x:15,y:15,width_m:4,height_m:1,rotation:90,locked:true,linked_table_id:'head'}]} as ReceptionFloorPlan;expect(autoArrangeReception(plan,[table('head')]).positions).toEqual([])});
