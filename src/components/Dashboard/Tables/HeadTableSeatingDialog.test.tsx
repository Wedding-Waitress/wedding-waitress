import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {describe,it,expect,vi} from 'vitest';
import {HeadTableSeatingDialog} from './HeadTableSeatingDialog';
import type {TableWithGuestCount} from '@/hooks/useTables';
const table={id:'head-review',limit_seats:2,head_seating_order:[]} as unknown as TableWithGuestCount;
describe('Head Table participant recovery',()=>{
 it('lets the owner explicitly add missing named hosts without auto-saving, then persists only on Save',async()=>{
  const save=vi.fn().mockResolvedValue(true);
  render(<HeadTableSeatingDialog open onOpenChange={vi.fn()} table={table} guests={[]} participant1="Host One" participant2="Host Two" onSave={save}/>);
  expect(screen.getByText('Add participants or guests to begin.')).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Add Host One'}));
  fireEvent.click(screen.getByRole('button',{name:'Add Host Two'}));
  expect(screen.queryByRole('button',{name:'Add Host One'})).toBeNull();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Save seating order'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith('head-review',[{kind:'participant',participant:'primary_1'},{kind:'participant',participant:'primary_2'}]));
 });
 it('preserves existing order and capacity and does not save when cancelled',()=>{
  const save=vi.fn(),close=vi.fn();
  const full={...table,limit_seats:1,head_seating_order:[{kind:'participant',participant:'primary_2'}]} as TableWithGuestCount;
  render(<HeadTableSeatingDialog open onOpenChange={close} table={full} guests={[]} participant1="Host One" participant2="Host Two" onSave={save}/>);
  expect(screen.getByRole('button',{name:'Add Host One'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Add Host Two'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);expect(save).not.toHaveBeenCalled();
 });
});

it('keeps linked couple records as the hosts, prevents duplicate add buttons, and swaps their existing guest seats', async () => {
 const save=vi.fn().mockResolvedValue(true);
 const people=[{id:'one',event_id:'event',user_id:'owner',first_name:'Alex',last_name:'Smith',guided_setup_origin:'wedding_couple_1',table_id:'head',seat_no:1},{id:'two',event_id:'event',user_id:'owner',first_name:'Casey',last_name:'Jones',guided_setup_origin:'wedding_couple_2',table_id:'head',seat_no:2}];
 const linked={...table,id:'head',event_id:'event',user_id:'owner',limit_seats:8,head_seating_order:[{kind:'guest',guest_id:'one'},{kind:'guest',guest_id:'two'}]} as TableWithGuestCount;
 render(<HeadTableSeatingDialog open onOpenChange={vi.fn()} table={linked} guests={people as any} participant1="Alex Smith" participant2="Casey Jones" onSave={save}/>);
 expect(screen.queryByRole('button',{name:'Add Alex Smith'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Add Casey Jones'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Swap/}));
 fireEvent.click(screen.getByRole('button',{name:'Save seating order'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith('head',[{kind:'guest',guest_id:'two'},{kind:'guest',guest_id:'one'}]));
});

it('does not recreate a participant reservation for a partner intentionally seated elsewhere',()=>{
 const save=vi.fn();const people=[{id:'one',event_id:'event',user_id:'owner',first_name:'Alex',last_name:'Smith',guided_setup_origin:'wedding_couple_1',table_id:'head',seat_no:3},{id:'two',event_id:'event',user_id:'owner',first_name:'Casey',last_name:'Jones',guided_setup_origin:'wedding_couple_2',table_id:'regular',seat_no:1}];
 render(<HeadTableSeatingDialog open onOpenChange={vi.fn()} table={{...table,id:'head',event_id:'event',user_id:'owner',limit_seats:6,head_seating_order:[{kind:'guest',guest_id:'one',seat_no:3}]} as TableWithGuestCount} guests={people as any} participant1="Alex Smith" participant2="Casey Jones" onSave={save}/>);
 expect(screen.queryByRole('button',{name:'Add Casey Jones'})).toBeNull();expect(save).not.toHaveBeenCalled();
});
