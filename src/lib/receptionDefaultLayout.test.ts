import {expect,it} from 'vitest';
import {RECEPTION_DEFAULT_ROOM,createReceptionDefaultFixtures,defaultReceptionTablePosition} from './receptionDefaultLayout';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import type {ReceptionTable} from '@/hooks/useReceptionTables';
const plan={room_width_m:20,room_length_m:35} as ReceptionFloorPlan;
const table=(n:number)=>({id:String(n),table_no:n,table_purpose:'standard'} as ReceptionTable);
it('uses the approved room dimensions and grid',()=>{expect(RECEPTION_DEFAULT_ROOM).toEqual({width:20,length:35,grid:50})});
it('places odd tables left and even tables right with equal row spacing',()=>{
 const positions=Array.from({length:10},(_,i)=>defaultReceptionTablePosition(table(i+1),plan));
 for(let i=0;i<10;i+=2){expect(positions[i].y).toBeCloseTo(10.761918);expect(positions[i+1].y).toBeCloseTo(23.2358,0);expect(Math.abs(positions[i].x-positions[i+1].x)).toBeLessThan(.04);if(i>0)expect(Math.abs(positions[i-2].x-positions[i].x-3.5)).toBeLessThan(.04)}
});
it('keeps further columns on their numbered side when the room depth is filled',()=>{
 for(let n=11;n<=20;n++){const p=defaultReceptionTablePosition(table(n),plan);expect(p.y>17.5).toBe(n%2===0);expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(20)}
});
it('matches the approved head table and fixture arrangement',()=>{
 const head=defaultReceptionTablePosition({...table(0),table_purpose:'head'},plan);
 expect(head).toMatchObject({rotation:270,y:17.03004606424186,width_m:7.054563595717209,height_m:1.875962787151629});
 const fixtures=createReceptionDefaultFixtures();
 const cake=fixtures.find(f=>f.type==='cake_table')!;
 const dance=fixtures.find(f=>f.type==='dance_floor')!;
 const stage=fixtures.find(f=>f.type==='dj_band')!;
 expect(head.x).toBeGreaterThan(cake.x);expect(cake.x).toBeGreaterThan(dance.x);expect(dance.x).toBeGreaterThan(stage.x);
 expect(Math.abs(cake.y-head.y)).toBeLessThan(.2);expect(Math.abs(dance.y-stage.y)).toBeLessThan(.1);expect(stage.rotation).toBe(90);
 expect(new Set(fixtures.map(f=>f.id)).size).toBe(10);
});
