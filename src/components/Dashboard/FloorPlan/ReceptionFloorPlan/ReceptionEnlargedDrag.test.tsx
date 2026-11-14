import {createRef} from 'react';
import {cleanup,fireEvent,render} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
import {ReceptionFloorPlanCanvas} from './ReceptionFloorPlanCanvas';
import type {ReceptionFloorPlan} from '@/hooks/useReceptionFloorPlan';
import type {ReceptionTable} from '@/hooks/useReceptionTables';
it.each([1.25,1.5,3])('preserves canonical drag coordinates at enlarged/pinch scale %s',scale=>{
vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}});
Object.defineProperty(HTMLElement.prototype,'setPointerCapture',{configurable:true,value:vi.fn()});
const plan={id:'plan',event_id:'event',room_width_m:15,room_length_m:20,grid_size_cm:50,table_positions:[{table_id:'table',x:5,y:5,rotation:0,locked:false}],fixtures:[],background:{path:null},vendor_notes:''} as ReceptionFloorPlan;
const table={id:'table',name:'Table',table_type:'round',table_purpose:'standard',limit_seats:8,guest_count:3,occupied_seat_numbers:[1,2,3]} as ReceptionTable;
const commit=vi.fn();const {container}=render(<ReceptionFloorPlanCanvas plan={plan} tables={[table]} event={{name:'Wedding'}} attendingCount={3} generatedAt={new Date()} a4Ref={createRef()} backgroundUrl={null} onChange={commit}/>);
const room=container.querySelector('[data-reception-room-canvas]') as HTMLElement;
Object.defineProperties(room,{offsetWidth:{value:1000},clientLeft:{value:0},clientTop:{value:0}});
room.getBoundingClientRect=()=>({left:0,top:0,width:1000*scale,height:750*scale,right:1000*scale,bottom:750*scale,x:0,y:0,toJSON(){}});
const target=container.querySelector('[data-reception-upright-label="table"]')!.parentElement!;
const pointer=(name:string,x:number,y:number)=>fireEvent(target,new MouseEvent(name,{bubbles:true,clientX:x*scale,clientY:y*scale}));
pointer('pointerdown',250,500);pointer('pointermove',300,500);pointer('pointermove',350,500);
expect(commit).not.toHaveBeenCalled();expect(target.parentElement!.style.left).toBe('350px');
pointer('pointerup',350,500);expect(commit).toHaveBeenCalledTimes(1);
const changed=commit.mock.calls[0][0]({...plan,vendor_notes:'Concurrent note'});
expect(changed.table_positions[0]).toMatchObject({x:5,y:7});expect(changed.vendor_notes).toBe('Concurrent note');
});

