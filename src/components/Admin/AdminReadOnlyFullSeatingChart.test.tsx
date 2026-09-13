import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminReadOnlyFullSeatingChart } from './AdminReadOnlyFullSeatingChart';
const { preview } = vi.hoisted(() => ({ preview: vi.fn() }));
vi.mock('@/components/Dashboard/FullSeatingChart/FullSeatingChartPreview', async () => {
  const { forwardRef } = await import('react');
  return { FullSeatingChartPreview: forwardRef((_props, _ref) => { preview(_props); return <div data-testid="authoritative-full-seating" />; }) };
});
const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const event = { name: 'Saved wedding', date: '2027-09-05', venue: 'Saved venue', start_time: null, finish_time: null };
const savedSettings = { user_id: ownerId, event_id: eventId, sort_by: 'lastName', font_size: 'small', paper_size: 'A4',
  show_dietary: false, show_rsvp: true, show_relation: true, show_guest_names: false, show_seat_numbers: false,
  show_guest_list: true, guest_name_color: '#000000', seat_number_color: '#C62828', guest_list_color: '#1565C0',
  dietary_color: '#2E7D32', relationship_color: '#967A59', show_logo: false, is_bold: false, is_italic: true, is_underline: false };
const guests = [{ id: 'guest', first_name: 'Élodie', last_name: 'O’Connor', table_id: 'table', table_no: 99,
  seat_no: 2, dietary: 'Vegetarian', rsvp: 'yes', relation_display: 'Bride / Friend', display_order: null }];
const tables = [{ id: 'table', table_no: 2, name: 'Actual Family Table' }];
const props = { ownerId, eventId, event, savedSettings, guests, tables };
beforeEach(() => preview.mockClear());
describe('saved Full Seating Chart readonly parity', () => {
  it.each([null, undefined, {}, { ...savedSettings, user_id: eventId }, { ...savedSettings, event_id: ownerId }])('never substitutes missing or foreign customization', savedSettings => {
    render(<AdminReadOnlyFullSeatingChart {...props} savedSettings={savedSettings} />);
    expect(screen.getByText(/A default customer chart has not been substituted/)).toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();
  });
  it('uses the same renderer, actual saved false flags, table resolution, and readonly checkboxes', () => {
    render(<AdminReadOnlyFullSeatingChart {...props} />);
    const actual = preview.mock.calls.at(-1)![0];
    expect(actual.disabled).toBe(false); expect(actual.readOnly).toBe(true);
    expect(actual.settings).toMatchObject({ sortBy: 'lastName', fontSize: 'small', showDietary: false,
      showGuestNames: false, showSeatNumbers: false, showGuestList: true, showRsvp: true, showRelation: true,
      showLogo: false, isBold: false, isItalic: true, isUnderline: false });
    expect(actual.guests[0]).toEqual({ ...guests[0], table_no: 2 });
    expect(actual.tableNameMap).toEqual({ 2: 'Actual Family Table' });
    expect(actual.tableIdNameMap).toEqual({ table: 'Actual Family Table' });
    expect(screen.queryByRole('button', { name: /^(save|send|delete|edit)\b/i })).not.toBeInTheDocument();
  });
  it('does not invent missing saved settings fields or split guest names', () => {
    const { show_relation: _missing, ...incomplete } = savedSettings;
    const view = render(<AdminReadOnlyFullSeatingChart {...props} savedSettings={incomplete} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Complete saved');
    expect(preview).not.toHaveBeenCalled();
    view.rerender(<AdminReadOnlyFullSeatingChart {...props} guests={[{ id: 'guest', name: 'Unknown split' }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Complete saved');
    expect(preview).not.toHaveBeenCalled();
  });
  it.each([{ settings: { ...savedSettings, show_guest_names: 'false' } },
    { guests: [{ ...guests[0], seat_no: '2' }] }, { guests: [{ ...guests[0], dietary: { text: 'Vegetarian' } }] },
    { tables: [{ ...tables[0], table_no: NaN }] }])('rejects malformed snapshot values rather than coercing customer output (%j)', changes => {
    render(<AdminReadOnlyFullSeatingChart {...props} {...changes} savedSettings={'settings' in changes ? changes.settings : savedSettings} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Complete saved');
    expect(preview).not.toHaveBeenCalled();
  });
});
