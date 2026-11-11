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
