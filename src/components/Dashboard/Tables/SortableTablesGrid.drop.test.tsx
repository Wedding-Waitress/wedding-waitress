import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
const capture=vi.hoisted(()=>({handlers:null as any}));
vi.mock('@dnd-kit/core',async importOriginal=>({...await importOriginal<any>(),DndContext:(props:any)=>{if(props)capture.handlers=props;return <>{props?.children}</>},DragOverlay:()=>null}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
import {SortableTablesGrid,useDragState} from './SortableTablesGrid';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
const SeatedProbe=()=> <div data-id="seated" data-testid="seated"/>;
it('retains the pointer drop position when clearing drag hints before saving a move',async()=>{
 const moving={id:'moving',first_name:'Moving',last_name:'Guest',table_id:'source',seat_no:1} as any;
 const seated={id:'seated',first_name:'Seated',table_id:'target',seat_no:1} as any;
 const move=vi.fn().mockResolvedValue(true);
 render(<SortableTablesGrid tables={[]} guests={[moving,seated]} onMoveGuest={move} onReorderGuests={vi.fn()}><SeatedProbe/></SortableTablesGrid>);
 vi.spyOn(screen.getByTestId('seated'),'getBoundingClientRect').mockReturnValue({top:100,height:20} as DOMRect);
 const active={id:'moving',data:{current:{type:'guest',guest:moving}}};
 await act(async()=>capture.handlers.onDragStart({active}));
 fireEvent(document,new MouseEvent('pointermove',{clientX:50,clientY:200}));
 await act(async()=>capture.handlers.onDragEnd({active,over:{id:'target',data:{current:{type:'table',tableId:'target'}}}}));
 expect(move).toHaveBeenCalledWith('moving','source','target','Moving Guest',1);
});
it('leaves the guest unchanged when dropped outside a valid target',async()=>{
 const moving={id:'moving',first_name:'Moving',table_id:'source',seat_no:1} as any;
 const move=vi.fn(),reorder=vi.fn();render(<SortableTablesGrid tables={[]} guests={[moving]} onMoveGuest={move} onReorderGuests={reorder}><div/></SortableTablesGrid>);
 const active={id:'moving',data:{current:{type:'guest',guest:moving}}};
 await act(async()=>capture.handlers.onDragEnd({active,over:{id:'not-a-table',data:{current:{type:'outside'}}}}));
 await act(async()=>capture.handlers.onDragEnd({active,over:null}));
 expect(move).not.toHaveBeenCalled();expect(reorder).not.toHaveBeenCalled();
});
it('keeps dragging locked until a seating save finishes',async()=>{
 const moving={id:'moving',first_name:'Moving',table_id:'source',seat_no:1} as any;
 let finish!:(value:boolean)=>void;const move=vi.fn(()=>new Promise<boolean>(resolve=>finish=resolve));
 const Probe=()=> <output data-testid="saving">{String(useDragState().isSaving)}</output>;
 render(<SortableTablesGrid tables={[]} guests={[moving]} onMoveGuest={move} onReorderGuests={vi.fn()}><Probe/></SortableTablesGrid>);
 const event={active:{id:'moving',data:{current:{type:'guest',guest:moving}}},over:{id:'target',data:{current:{type:'table',tableId:'target'}}}};
 let saving!:Promise<void>;act(()=>{saving=capture.handlers.onDragEnd(event);});expect(screen.getByTestId('saving')).toHaveTextContent('true');
 await act(async()=>capture.handlers.onDragEnd(event));expect(move).toHaveBeenCalledTimes(1);
 await act(async()=>{finish(true);await saving;});expect(screen.getByTestId('saving')).toHaveTextContent('false');
});
