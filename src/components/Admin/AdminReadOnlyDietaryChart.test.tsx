import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { AdminReadOnlyDietaryChart } from './AdminReadOnlyDietaryChart';
const mocks = vi.hoisted(() => ({ guests: vi.fn(() => { throw new Error('Customer guest hook forbidden'); }),
  tables: vi.fn(() => { throw new Error('Customer table hook forbidden'); }),
  settings: vi.fn(() => { throw new Error('Customer settings hook forbidden'); }) }));
vi.mock('@/hooks/useRealtimeGuests', () => ({ useRealtimeGuests: mocks.guests }));
vi.mock('@/hooks/useTables', () => ({ useTables: mocks.tables }));
vi.mock('@/hooks/useDietaryChartSettings', async (original) => ({ ...(await original<any>()), useDietaryChartSettings: mocks.settings }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const savedSettings = { user_id: ownerId, event_id: eventId, sort_by: 'tableNo', font_size: 'standard',
  guest_name_color: '#C62828', guest_list_color: '#000000', dietary_color: '#1565C0', relationship_color: '#000000', seat_number_color: '#000000',
  show_guest_names: true, show_guest_list: true, show_dietary: true, show_relation: false, show_seat_numbers: false,
  show_seat_no: true, show_logo: false, paper_size: 'A4', is_bold: false, is_italic: true, is_underline: false };
const guests = [{ id: 'guest', first_name: 'Élodie', last_name: 'O’Connor', dietary: 'Vegetarian', table_id: 'table',
  table_no: 99, seat_no: 2, mobile: null, relation_partner: 'partner_one', relation_role: 'guest' }];
const tables = [{ id: 'table', name: 'Actual family table', table_no: 2 }];
const props = { ownerId, eventId, savedSettings, guests, tables, event: { name: 'Saved wedding', date: '2027-09-05', venue: 'Actual venue' } };
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
  width: 700, height: 32, x: 0, y: 0, top: 0, left: 0, right: 700, bottom: 32, toJSON: () => ({}) }); });
afterEach(() => vi.restoreAllMocks());
it.each([null, undefined, {}, { ...savedSettings, user_id: eventId }])('does not invent missing or foreign saved customization (%j)', savedSettings => {
  render(<AdminReadOnlyDietaryChart {...props} savedSettings={savedSettings} />);
  expect(screen.getByText(/A default customer report has not been substituted/)).toBeInTheDocument();
  expect(document.querySelector('[data-dietary-a4-preview]')).toBeNull();
});
it('uses the authoritative renderer and actual saved settings without customer hooks or writes', () => {
  render(<AdminReadOnlyDietaryChart {...props} />);
  const page = document.querySelector('[data-dietary-a4-preview]') as HTMLElement;
  expect(page.style.width).toBe('210mm'); expect(page.style.height).toBe('297mm');
  expect(page.textContent).toContain('Élodie');
  expect(page.querySelector('[data-dietary-field="table"]')?.textContent).toBe('2');
  expect(page.querySelector('[data-dietary-field="seat"]')?.textContent).toBe('');
  expect(page.querySelector('[data-dietary-field="relationship"]')?.textContent).toBe('');
  expect((page.querySelector('[data-dietary-field="first-name"]') as HTMLElement).style.color).toBe('rgb(198, 40, 40)');
  expect(screen.getByRole('switch', { name: 'Show Guest Names' })).toBeDisabled();
  fireEvent.click(screen.getByRole('switch', { name: 'Show Guest Names' }));
  expect(page.textContent).toContain('Élodie');
  expect(mocks.guests).not.toHaveBeenCalled(); expect(mocks.tables).not.toHaveBeenCalled(); expect(mocks.settings).not.toHaveBeenCalled();
});
it('fails closed on malformed settings or incomplete actual guest content', () => {
  const view = render(<AdminReadOnlyDietaryChart {...props} savedSettings={{ ...savedSettings, show_relation: 'false' }} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Complete saved');
  view.rerender(<AdminReadOnlyDietaryChart {...props} guests={[{ ...guests[0], mobile: undefined }]} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Complete saved');
  expect(document.querySelector('[data-dietary-a4-preview]')).toBeNull();
});
