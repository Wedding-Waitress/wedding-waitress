import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TableVisualization } from './TableVisualization';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(cleanup);
beforeEach(() => rpc.mockReset());

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
