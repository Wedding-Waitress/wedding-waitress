import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
vi.mock('@dnd-kit/sortable',()=>({useSortable:()=>({attributes:{},listeners:{},setNodeRef:vi.fn(),transform:null,transition:null,isDragging:false})}));
import {RunningSheetRow} from './RunningSheetRow';
const item:any={id:'row',sheet_id:'sheet',order_index:0,time_text:'5 PM',description_rich:{text:'Start',bullets:['First bullet'],subText:'(Existing note)'},responsible:'MC'};
it('preserves the exact order of edited bullets and multiple notes',()=>{const update=vi.fn();render(<RunningSheetRow item={item} onUpdate={update} onDuplicate={vi.fn()} onDelete={vi.fn()}/>);const value='Opening\n• First bullet\n(First note)\nNext activity\n• Second bullet\n(Second note)';fireEvent.change(screen.getByRole('textbox',{name:'Event'}),{target:{value}});expect(update).toHaveBeenCalledWith('row',{description_rich:{text:value}});});
it('disables every row input and dragging for view-only recipients',()=>{render(<RunningSheetRow item={item} onUpdate={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} disabled/>);for(const input of screen.getAllByRole('textbox'))expect(input).toBeDisabled();expect(screen.getByRole('button',{name:'Drag to reorder row'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Row actions'})).toBeNull();});
it('makes reorder handles reachable by keyboard for editors',()=>{render(<RunningSheetRow item={item} onUpdate={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()}/>);expect(screen.getByRole('button',{name:'Drag to reorder row'})).toHaveAttribute('tabindex','0');});

it('keeps the same row-actions button mounted during a temporary save lock',()=>{
 const props={item,onUpdate:vi.fn(),onDuplicate:vi.fn(),onDelete:vi.fn(),readOnly:false};
 const {rerender}=render(<RunningSheetRow {...props}/>);
 const button=screen.getByRole('button',{name:'Row actions'});
 rerender(<RunningSheetRow {...props} disabled/>);
 expect(screen.getByRole('button',{name:'Row actions'})).toBe(button);
 expect(button).toBeVisible();expect(button).toBeDisabled();
 rerender(<RunningSheetRow {...props}/>);
 expect(screen.getByRole('button',{name:'Row actions'})).toBe(button);expect(button).toBeEnabled();
});
