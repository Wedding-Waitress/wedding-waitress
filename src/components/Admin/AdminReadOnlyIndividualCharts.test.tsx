import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminReadOnlyIndividualCharts } from './AdminReadOnlyIndividualCharts';
const { preview } = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock('@/components/Dashboard/IndividualTableChart/IndividualTableChartPreview', () => ({ IndividualTableChartPreview: (props: unknown) => { preview(props); return <div data-testid="authoritative-chart" />; } }));
const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const settings = {
  tableShape: 'long', fontSize: 'large', guestTextSize: 'small',
  includeNames: true, includeDietary: false, includeRelation: true, includeGuestList: false,
  showSeatNumbers: false, isBold: true, isItalic: true, isUnderline: false, largerTableNames: true,
  showLogo: false, enableEndSeats: true, endSeatsCount: 1, paperSize: 'A4',
  guestNameColor: '#000000', seatNumberColor: '#C62828', guestListColor: '#1565C0',
  dietaryColor: '#2E7D32', relationshipColor: '#967A59',
};
const event = { name: 'Actual saved wedding', date: '2027-09-05', venue: 'Actual venue', start_time: null, finish_time: null };
const tables = [{ id: 'table-2', name: 'Table Two', table_no: 2, limit_seats: 8, table_purpose: 'standard', head_seating_order: [] },
  { id: 'table-1', name: 'Table One', table_no: 1, limit_seats: 8, table_purpose: 'standard', head_seating_order: [] }];
const guests = [{ id: 'guest', first_name: 'Élodie', last_name: 'O’Connor', table_id: 'table-1', seat_no: 1, dietary: 'Vegetarian', relation_display: 'Bride / Friend', display_order: null }];
const props = { ownerId, eventId, event, tables, guests, snapshot: { user_id: ownerId, event_id: eventId, revision: 1, settings } };
beforeEach(() => preview.mockClear());
describe('saved customer Individual Chart read-only adapter', () => {
  it.each([null, undefined, {}, { ...props.snapshot, user_id: eventId }])('does not invent styles when saved provenance is missing or mismatched', snapshot => {
    render(<AdminReadOnlyIndividualCharts {...props} snapshot={snapshot} />);
    expect(screen.getByText(/Historical browser-only customization is unavailable/)).toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('uses the existing authoritative preview and exact saved settings, data, and table order', () => {
    render(<AdminReadOnlyIndividualCharts {...props} />);
    const first = preview.mock.calls.at(-1)![0];
    expect(first.settings).toEqual({ ...settings, title: 'TABLE 1' });
    expect(first.guests).toBe(guests);
    expect(first.event).toBe(event);
    expect(first.currentTableIndex).toBe(1);
    expect(first.totalTables).toBe(2);
    expect(screen.queryByRole('button', { name: /^(save|send|delete|edit)\b/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'table-2' } });
    expect(preview.mock.calls.at(-1)![0].settings).toEqual({ ...settings, title: 'TABLE 2' });
  });
  it('rejects incomplete guest data instead of omitting names or relationship content', () => {
    render(<AdminReadOnlyIndividualCharts {...props} guests={[{ id: 'guest', name: 'Unknown split' }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No partial printable chart');
    expect(preview).not.toHaveBeenCalled();
  });
});
