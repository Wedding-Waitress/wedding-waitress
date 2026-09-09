import React, {useState} from 'react';
import {render, screen, fireEvent, waitFor, cleanup} from '@testing-library/react';
import {afterEach, describe, it, expect, vi} from 'vitest';
import {RunningSheetSection} from './RunningSheetSection';
import {RunningSheetItem} from '@/types/runningSheet';
vi.mock('@/components/ui/dropdown-menu',()=>({
 DropdownMenu:({children}:any)=><div>{children}</div>, DropdownMenuTrigger:({children}:any)=><>{children}</>,
 DropdownMenuContent:({children}:any)=><div>{children}</div>, DropdownMenuItem:({children,onClick,disabled}:any)=><button disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('./RunningSheetRow',()=>({RunningSheetRow:({item}:any)=><div data-testid="schedule-row">{item.time_text}|{item.description_rich.text}|{item.responsible}</div>}));
afterEach(cleanup);
const rows = [0,1].map(n=>({id:`row-${n}`,sheet_id:'sheet',order_index:n,time_text:`${n+5} PM`,description_rich:{text:`Activity ${n}`,bullets:['Keep this']},responsible:'MC',is_section_header:n===0,is_bold:true,is_italic:true,is_underline:true,created_at:'',updated_at:''}));
function Harness({restore=async(rows:RunningSheetItem[])=>rows,readOnly=false}:any){
 const [items,setItems]=useState<RunningSheetItem[]>(rows);
 return <RunningSheetSection label="Run Sheet" notes={null} onLabelChange={()=>{}} onNotesChange={()=>{}} items={items}
 onUpdateItem={(id,patch)=>setItems(items=>items.map(row=>row.id===id?{...row,...patch}:row))}
 onDeleteItem={async id=>{await Promise.resolve();setItems(items=>items.filter(row=>row.id!==id));}}
 onRestoreItems={async snapshot=>{const saved=await restore(snapshot);if(saved)setItems(saved);return saved;}}
 onAddItem={()=>{}} onDuplicateItem={()=>{}} onReorderItems={()=>{}} onResetToDefault={()=>{}} disabled={readOnly}/>;
}
describe('schedule Undo',()=>{
 it('restores Delete All Rows, including rich text, formatting and order, from the visible top button',async()=>{
  const restore=vi.fn(async rows=>rows); render(<Harness restore={restore}/>);
  expect(screen.getByRole('button',{name:'Undo'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Delete All Rows'}));
  fireEvent.click(screen.getByRole('button',{name:'Delete'}));
  await waitFor(()=>expect(screen.queryAllByTestId('schedule-row')).toHaveLength(0));
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  await waitFor(()=>expect(screen.getAllByTestId('schedule-row')).toHaveLength(2));
  expect(restore).toHaveBeenCalledWith(rows);
  expect(screen.getAllByTestId('schedule-row')[0]).toHaveTextContent('5 PM|Activity 0|MC');
  await waitFor(()=>expect(screen.getByRole('button',{name:'Undo'})).toBeDisabled());
 });
 it('restores a bulk clear and retains the snapshot after a failed save',async()=>{
  const restore=vi.fn().mockResolvedValueOnce(null).mockImplementation(async rows=>rows);render(<Harness restore={restore}/>);
  fireEvent.click(screen.getByRole('button',{name:'Clear All Fields'}));fireEvent.click(screen.getByRole('button',{name:'Clear All'}));
  expect(screen.getAllByTestId('schedule-row')[0]).toHaveTextContent('||');
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Undo'})).toBeEnabled();
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  await waitFor(()=>expect(screen.getAllByTestId('schedule-row')[0]).toHaveTextContent('Activity 0'));
  expect(restore.mock.calls[1][0]).toEqual(rows);
 });
 it('does not expose Undo to view-only recipients',()=>{render(<Harness readOnly/>);expect(screen.queryByRole('button',{name:'Undo'})).toBeNull();expect(screen.getByRole('button',{name:'More actions'})).toBeDisabled();});
});
