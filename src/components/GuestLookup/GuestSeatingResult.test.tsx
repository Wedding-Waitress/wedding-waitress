import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GuestSeatingResult } from './GuestSeatingResult';
import { publicGuestSeatingRows } from '@/i18n/publicGuestSeatingCopy';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
afterEach(cleanup);
beforeEach(() => { rpc.mockReset(); });
const guest = { id: 'guest', first_name: 'Test', last_name: 'Guest', table_id: 'table', table_no: null, seat_no: 4 };
const row = (number: number | null, name: string, seat: number | null = 4) => ({
  table_id: 'table', table_no: number, table_name: name, limit_seats: 12,
  guest_id: 'guest', guest_first_name: 'Test', guest_last_name: 'Guest', guest_seat_no: seat,
});
function load(rows: ReturnType<typeof row>[]) {
  rpc.mockImplementation(async (name: string) => ({ error: null,
    data: name === 'get_public_table_semantics' ? { table_purpose: 'standard' } : rows,
  }));
}
const tableText = (container: HTMLElement) => container.querySelector('[data-guest-table]')!.textContent;
const seatText = (container: HTMLElement) => container.querySelector('[data-guest-seat]')!.textContent;

it.each([
  [null, 'Table 6', 'Table 6'],
  [null, 'Main Table', 'Main Table'],
  [null, 'Bridal Table', 'Bridal Table'],
  [null, '6. Garden', '6. Garden'],
  [null, '4a', '4a'],
  [6, '6', 'Table 6'],
  [6, 'Table 6', 'Table 6'],
  [6, 'Garden', 'Table 6 – Garden'],
  [6, '', 'Table 6'],
] as const)('resolves numbered and named table records (%s, %s)', async (number, name, label) => {
  load([row(number, name)]);
  const { container } = render(<GuestSeatingResult guest={guest} eventId="event" copy={publicGuestSeatingRows.en} />);
  await screen.findByTitle('Test Guest');
  await waitFor(() => expect(tableText(container)).toBe(label));
  expect(seatText(container)).toBe('Seat 4');
  expect(container.querySelector('[data-qr-seated-guest-seat]')).toHaveTextContent('Seat 4');
});

it('uses the canonical table and seat instead of stale guest numeric fields', async () => {
  load([row(null, 'Table 6', 3)]);
  const { container } = render(<GuestSeatingResult guest={{ ...guest, table_no: 2, seat_no: 8 }} eventId="event" copy={publicGuestSeatingRows.en} />);
  await screen.findByTitle('Test Guest');
  await waitFor(() => expect(tableText(container)).toBe('Table 6'));
  expect(seatText(container)).toBe('Seat 3');
});

it('keeps a deliberately blank seat blank in the summary and diagram', async () => {
  load([row(null, 'Garden', null)]);
  const { container } = render(<GuestSeatingResult guest={guest} eventId="event" copy={publicGuestSeatingRows.en} />);
  await screen.findByText('Seated Guests');
  await waitFor(() => expect(tableText(container)).toBe('Garden'));
  expect(seatText(container)).toBe('Not assigned yet');
  expect(container.querySelector('[data-qr-seated-guest-seat]')).toBeNull();
});

it('does not invent an assignment or fetch a table for an unassigned guest', () => {
  const { container } = render(<GuestSeatingResult guest={{ ...guest, table_id: null, seat_no: null }} eventId="event" copy={publicGuestSeatingRows.en} />);
  expect(tableText(container)).toBe('Not assigned yet');
  expect(seatText(container)).toBe('Not assigned yet');
  expect(rpc).not.toHaveBeenCalled();
});

it('retains legacy guest number and seat when table details are unavailable', async () => {
  rpc.mockResolvedValue({ data: null, error: null });
  const { container } = render(<GuestSeatingResult guest={{ ...guest, table_no: 6 }} eventId="event" copy={publicGuestSeatingRows.en} />);
  await screen.findByText('Table information not available');
  expect(tableText(container)).toBe('Table 6');
  expect(seatText(container)).toBe('Seat 4');
});

it('does not leak a previous table summary across event changes or late responses', async () => {
  const pending = new Map<string, (value: unknown) => void>();
  rpc.mockImplementation((name: string, args: any) => name === 'get_public_table_semantics'
    ? Promise.resolve({ data: { table_purpose: 'standard' }, error: null })
    : new Promise(resolve => pending.set(args.p_event_id, resolve)));
  const view = render(<GuestSeatingResult guest={guest} eventId="first" copy={publicGuestSeatingRows.en} />);
  await act(async () => pending.get('first')!({ data: [row(null, 'Old Table')], error: null }));
  await waitFor(() => expect(tableText(view.container)).toBe('Old Table'));
  view.rerender(<GuestSeatingResult guest={guest} eventId="second" copy={publicGuestSeatingRows.en} />);
  expect(tableText(view.container)).toBe('Not assigned yet');
  view.rerender(<GuestSeatingResult guest={guest} eventId="third" copy={publicGuestSeatingRows.en} />);
  await act(async () => pending.get('third')!({ data: [row(null, 'New Table')], error: null }));
  await act(async () => pending.get('second')!({ data: [row(null, 'Late Table')], error: null }));
  await waitFor(() => expect(tableText(view.container)).toBe('New Table'));
});
