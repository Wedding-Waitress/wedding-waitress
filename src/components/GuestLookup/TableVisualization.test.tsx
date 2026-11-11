import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
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
        { table_id: 'table-2', table_no: 2, table_name: '2', limit_seats: 8,
          guest_id: 'sophie', guest_first_name: 'Sophie', guest_last_name: 'Bennett', guest_seat_no: 1 },
        { table_id: 'table-2', table_no: 2, table_name: '2', limit_seats: 8,
          guest_id: 'james', guest_first_name: 'James', guest_last_name: 'Bennett', guest_seat_no: 2 },
      ],
  }));
  render(<TableVisualization tableId="table-2" tableNumber={2} eventId="event-1" />);
  const sophieSeat = await screen.findByTitle('Sophie Bennett');
  expect(sophieSeat.textContent).toBe('SophieBennett');
  expect((await screen.findByTitle('James Bennett')).textContent).toBe('JamesBennett');
  expect(screen.getByText('Seated Guests')).toBeInTheDocument();
  expect(screen.queryByText('Table information not available')).not.toBeInTheDocument();
  expect(rpc).toHaveBeenCalledWith('get_public_table_semantics', { p_table_id: 'table-2', p_event_id: 'event-1' });
});

it('does not render a table when the public lookup returns no permitted data', async () => {
  rpc.mockResolvedValue({ error: null, data: null });
  render(<TableVisualization tableId="table-2" tableNumber={2} eventId="event-1" />);
  expect(await screen.findByText('Table information not available')).toBeInTheDocument();
  expect(screen.queryByText('Seated Guests')).not.toBeInTheDocument();
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
