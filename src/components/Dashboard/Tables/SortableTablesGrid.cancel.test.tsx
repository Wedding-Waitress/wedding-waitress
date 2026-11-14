import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import {SortableTablesGrid, useDragState} from './SortableTablesGrid';
import {TableGuestList} from './TableGuestList';
import type {Guest} from '@/hooks/useGuests';
import type {TableWithGuestCount} from '@/hooks/useTables';
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
const guest={id:'review-guest',first_name:'Existing',last_name:'Guest',table_id:'review-table',seat_no:1} as Guest;
const table={id:'review-table',name:'One',limit_seats:10,guest_count:1,table_purpose:'standard',head_seating_order:[]} as TableWithGuestCount;
function StateProbe(){const state=useDragState();return <output data-testid="drag-state">{JSON.stringify(state)}</output>}
describe('Guest drag cancellation',()=>{
 it('clears active drag hints and never saves a move when Escape cancels a keyboard pickup',async()=>{
  const move=vi.fn().mockResolvedValue(true),reorder=vi.fn().mockResolvedValue(true);
  render(<SortableTablesGrid tables={[table]} guests={[guest]} onMoveGuest={move} onReorderGuests={reorder}><div><StateProbe/><TableGuestList tableId={table.id} guests={[guest]}/></div></SortableTablesGrid>);
  const handle=screen.getByRole('button',{name:'Drag guest to another seat or table'});
  handle.focus();
  fireEvent.keyDown(handle,{key:' ',code:'Space'});
  await waitFor(()=>expect(screen.getByTestId('drag-state').textContent).toContain('review-guest'));
  expect(screen.getByText('Drop here for Seat 1')).toBeTruthy();
  fireEvent.keyDown(document,{key:'Escape',code:'Escape'});
  await waitFor(()=>expect(screen.queryByText('Drop here for Seat 1')).toBeNull());
  expect(JSON.parse(screen.getByTestId('drag-state').textContent!)).toEqual({activeGuestId:null,overGuestId:null,overTableId:null,isOverUnassigned:false,overGuestPosition:null});
  expect(move).not.toHaveBeenCalled();expect(reorder).not.toHaveBeenCalled();
 });
});
