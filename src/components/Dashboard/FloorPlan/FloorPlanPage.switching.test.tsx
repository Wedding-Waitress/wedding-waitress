import React,{useEffect} from 'react';import {cleanup,fireEvent,render,screen} from '@testing-library/react';import {afterEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({mounts:[] as string[],unmounts:[] as string[]}));
vi.mock('@/hooks/useCeremonyFloorPlan',()=>({useCeremonyFloorPlan:()=>({floorPlan:{chairs_per_row:6,total_rows:12,assigned_rows:12},loading:false,initialLoadComplete:true,createFloorPlan:vi.fn(),updateFloorPlan:vi.fn(),updateSeatAssignment:vi.fn(),updateBridalPartyMember:vi.fn(),updateBridalPartyRole:vi.fn()})}));
vi.mock('./CeremonyFloorPlan/CeremonyFloorPlanA4',()=>({CeremonyFloorPlanA4Preview:()=> <div>Ceremony canvas</div>}));
vi.mock('./CeremonyFloorPlan/CeremonyFloorPlanSettings',()=>({CeremonyFloorPlanSettings:()=>null}));
vi.mock('./ReceptionFloorPlan/ReceptionFloorPlanPage',()=>({ReceptionFloorPlanPage:({selectedEventId,active}:any)=>{useEffect(()=>{mocks.mounts.push(selectedEventId);return()=>{mocks.unmounts.push(selectedEventId)}},[]);return active?<div>Reception canvas {selectedEventId}</div>:null;}}));
vi.mock('@/components/ui/select',()=>({Select:({children,onValueChange}:any)=><div onClick={event=>{const value=(event.target as HTMLElement).dataset.value;if(value)onValueChange(value)}}>{children}</div>,SelectTrigger:({children}:any)=><div>{children}</div>,SelectValue:()=>null,SelectContent:({children}:any)=><div>{children}</div>,SelectItem:({children,value}:any)=><button data-value={value}>{children}</button>}));
import {FloorPlanPage} from './FloorPlanPage';
afterEach(()=>{cleanup();mocks.mounts=[];mocks.unmounts=[];});
it('retains Reception hooks across type switching while showing only the selected canvas',()=>{
 const events=[{id:'a',name:'Event A'},{id:'b',name:'Event B'}] as any;
 const {rerender}=render(<FloorPlanPage selectedEventId="a" onEventSelect={()=>undefined} events={events} eventsLoading={false}/>);
 expect(mocks.mounts).toEqual([]);fireEvent.click(screen.getByRole('button',{name:'Reception'}));expect(screen.getByText('Reception canvas a')).toBeVisible();expect(mocks.mounts).toEqual(['a']);
 fireEvent.click(screen.getByRole('button',{name:'Ceremony'}));expect(screen.queryByText('Reception canvas a')).toBeNull();expect(screen.getByText('Ceremony canvas')).toBeVisible();expect(mocks.unmounts).toEqual([]);
 fireEvent.click(screen.getByRole('button',{name:'Reception'}));expect(mocks.mounts).toEqual(['a']);
 rerender(<FloorPlanPage selectedEventId="b" onEventSelect={()=>undefined} events={events} eventsLoading={false}/>);expect(screen.queryByText('Reception canvas a')).toBeNull();expect(screen.getByText('Reception canvas b')).toBeVisible();expect(mocks.mounts).toEqual(['a','b']);expect(mocks.unmounts).toEqual(['a']);
 fireEvent.click(screen.getByRole('button',{name:'Ceremony'}));fireEvent.click(screen.getByRole('button',{name:'Reception'}));expect(mocks.mounts).toEqual(['a','b']);
});
