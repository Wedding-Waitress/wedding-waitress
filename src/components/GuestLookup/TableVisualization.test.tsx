import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TableVisualization } from './TableVisualization';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(cleanup);
beforeEach(() => { rpc.mockReset(); });

it('loads public table details and renders full guest names at the assigned seats', async () => {
  rpc.mockImplementation(async (name: string) => ({
    error: null,
    data: name === 'get_public_table_semantics'
      ? { table_purpose: 'standard', head_seating_order: [] }
      : [
        { table_id: 'table-2', table_no: 2, table_name: '2', limit_seats: 8, table_notes: '8–12 people per table',
          guest_id: 'sophie', guest_first_name: 'Sophie', guest_last_name: 'Bennett', guest_seat_no: 1 },
        { table_id: 'table-2', table_no: 2, table_name: '2', limit_seats: 8,
          guest_id: 'james', guest_first_name: 'James', guest_last_name: 'Bennett', guest_seat_no: 2 },
      ],
  }));
  const view = render(<TableVisualization tableId="table-2" tableNumber={2} eventId="event-1" />);
  const sophieSeat = await screen.findByTitle('Sophie Bennett');
  expect(sophieSeat.textContent).toBe('SophieBennett');
  expect((await screen.findByTitle('James Bennett')).textContent).toBe('JamesBennett');
  expect(screen.getByText('Seated Guests')).toBeInTheDocument();
  expect(screen.queryByText('Table information not available')).not.toBeInTheDocument();
  expect(screen.queryByText('8–12 people per table')).not.toBeInTheDocument();
  expect(screen.getByText('(2 of 8)')).toBeInTheDocument();
  expect(screen.getByTitle('Seat 8')).toBeInTheDocument();
  expect(view.container.firstElementChild!.children).toHaveLength(1);
  expect(view.container.querySelector('[data-qr-selected-guest-name]')).toBeNull();
  expect(rpc).toHaveBeenCalledWith('get_public_table_semantics', { p_table_id: 'table-2', p_event_id: 'event-1' });
});

it('does not render a table when the public lookup returns no permitted data', async () => {
  rpc.mockResolvedValue({ error: null, data: null });
  render(<TableVisualization tableId="table-2" tableNumber={2} eventId="event-1" />);
  expect(await screen.findByText('Table information not available')).toBeInTheDocument();
  expect(screen.queryByText('Seated Guests')).not.toBeInTheDocument();
});

it('preserves navigation and the loading state without an empty notes header', () => {
  rpc.mockImplementation(() => new Promise(() => {}));
  const view = render(<TableVisualization tableId="table-2" tableNumber={2} eventId="event-1" navigation={<button>Back</button>} />);
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  expect(view.container.querySelector('.animate-pulse')).toBeInTheDocument();
  expect(view.container.firstElementChild!.children).toHaveLength(2);
  expect(screen.queryByText('Seated Guests')).not.toBeInTheDocument();
});

it('fits the entire bridal table to a narrow viewport and restores full size on desktop',async()=>{
 let width=280;
 const measuredWidth=vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(function(this:HTMLElement){return this.hasAttribute('data-head-table-viewport')?width:560;});
 const measuredHeight=vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockReturnValue(188);
 rpc.mockImplementation(async(name:string)=>({error:null,data:name==='get_public_table_semantics'
  ?{table_purpose:'head',head_seating_order:[{kind:'guest',guest_id:'one'},{kind:'guest',guest_id:'two'}]}
  :[{table_id:'head',table_no:1,table_name:'Bridal Table',table_notes:'Organiser-only head table note',limit_seats:2,guest_id:'one',guest_first_name:'Alex',guest_last_name:'Smith',guest_seat_no:1},{table_id:'head',table_no:1,table_name:'Bridal Table',limit_seats:2,guest_id:'two',guest_first_name:'Casey',guest_last_name:'Jones',guest_seat_no:2}]}));
 try {
  const view=render(<TableVisualization tableId="head" tableNumber={1} eventId="event" selectedGuestId="two"/>);await screen.findByText('Bridal Table');
  const diagram=view.container.querySelector<HTMLElement>('[data-head-table-diagram]')!,viewport=view.container.querySelector<HTMLElement>('[data-head-table-viewport]')!;
  await waitFor(()=>expect(diagram.style.transform).toBe('scale(0.5)'));expect(viewport.style.height).toBe('94px');
  expect(diagram).toHaveTextContent('Alex Smith');expect(diagram).toHaveTextContent('Casey Jones');
  expect(view.container.querySelector('[data-qr-selected-guest-name]')).toHaveTextContent('Casey Jones');
  expect(diagram.querySelector('[data-qr-selected-guest-name]')).toBeNull();
  expect(screen.queryByText('Organiser-only head table note')).not.toBeInTheDocument();
  expect(view.container.firstElementChild!.children).toHaveLength(1);
  width=720;act(()=>window.dispatchEvent(new Event('resize')));
  await waitFor(()=>expect(diagram.style.transform).toBe('scale(1)'));expect(diagram.style.width).toBe('720px');
 } finally {measuredWidth.mockRestore();measuredHeight.mockRestore();}
});

it('clears previous seating while switching tables and ignores late responses', async () => {
  const pending = new Map<string,(value:any)=>void>();
  rpc.mockImplementation((name:string,args:any) => name==='get_public_table_semantics'
    ? Promise.resolve({data:{table_purpose:'standard'},error:null})
    : new Promise(resolve=>pending.set(args.p_table_id,resolve)));
  const row = (id:string) => ({data:[{table_id:id,table_no:1,table_name:id,limit_seats:4,guest_id:id,guest_first_name:id,guest_last_name:'Guest',guest_seat_no:1}],error:null});
  const view=render(<TableVisualization tableId="first" tableNumber={1} eventId="event"/>);
  view.rerender(<TableVisualization tableId="second" tableNumber={2} eventId="event"/>);
  await act(async()=>pending.get('second')!(row('second')));
  expect(await screen.findByTitle('second Guest')).toBeInTheDocument();
  await act(async()=>pending.get('first')!(row('first')));
  expect(screen.queryByTitle('first Guest')).not.toBeInTheDocument();
  expect(screen.getByTitle('second Guest')).toBeInTheDocument();
  view.rerender(<TableVisualization tableId="third" tableNumber={3} eventId="event"/>);
  expect(screen.queryByTitle('second Guest')).not.toBeInTheDocument();
  await act(async()=>pending.get('third')!({data:null,error:new Error('Denied')}));
  expect(await screen.findByText('Table information not available')).toBeInTheDocument();
});

it('marks only the selected name by ID, including duplicate names and similar names', async () => {
  rpc.mockImplementation(async (name: string) => ({ error: null, data: name === 'get_public_table_semantics'
    ? { table_purpose: 'standard' }
    : [
      { table_id: 'table', table_no: 1, table_name: '1', limit_seats: 4, guest_id: 'primary', guest_first_name: 'Alex', guest_last_name: 'Example', guest_seat_no: 1, guest_rsvp: 'Attending' },
      { table_id: 'table', table_no: 1, table_name: '1', limit_seats: 4, guest_id: 'duplicate', guest_first_name: 'Alex', guest_last_name: 'Example', guest_seat_no: 2, guest_rsvp: 'Pending' },
      { table_id: 'table', table_no: 1, table_name: '1', limit_seats: 4, guest_id: 'senior', guest_first_name: 'Alex', guest_last_name: 'Example Snr', guest_seat_no: 3, guest_rsvp: 'Not Attending' },
    ] }));
  const view = render(<TableVisualization tableId="table" tableNumber={1} eventId="event" selectedGuestId="primary" />);
  await screen.findByText('Seated Guests');
  const markedRow = () => view.container.querySelector('[data-qr-selected-guest-name]')!.closest('[data-qr-seated-guest-row]')!;
  expect(view.container.querySelectorAll('[data-qr-selected-guest-name]')).toHaveLength(1);
  expect(markedRow()).toHaveTextContent('Seat 1');
  expect(markedRow().querySelector('[data-qr-seated-guest-status]')).toHaveClass('text-green-500');
  expect(view.container.querySelector('[data-round-guest-table] [data-qr-selected-guest-name]')).toBeNull();
  view.rerender(<TableVisualization tableId="table" tableNumber={1} eventId="event" selectedGuestId="duplicate" />);
  expect(markedRow()).toHaveTextContent('Seat 2');
  expect(markedRow().querySelector('[data-qr-seated-guest-status]')).toHaveClass('text-warning');
  view.rerender(<TableVisualization tableId="table" tableNumber={1} eventId="event" selectedGuestId="senior" />);
  expect(view.container.querySelector('[data-qr-selected-guest-name]')).toHaveTextContent('Alex Example Snr');
  expect(markedRow()).toHaveTextContent('Seat 3');
  expect(markedRow().querySelector('[data-qr-seated-guest-status]')).toHaveClass('text-red-500');
  view.rerender(<TableVisualization tableId="table" tableNumber={1} eventId="event" />);
  expect(view.container.querySelector('[data-qr-selected-guest-name]')).toBeNull();
  view.rerender(<TableVisualization tableId="table" tableNumber={1} eventId="event" selectedGuestId="missing" />);
  expect(view.container.querySelector('[data-qr-selected-guest-name]')).toBeNull();
  expect(rpc).toHaveBeenCalledTimes(2);
});
