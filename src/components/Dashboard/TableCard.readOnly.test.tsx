import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { Guest } from '@/hooks/useGuests';

vi.mock('./Tables/TableGuestList', () => ({ TableGuestList: () => { throw new Error('Readonly cards must not mount drag targets'); } }));
vi.mock('./Tables/HeadTableSeatingDialog', () => ({ HeadTableSeatingDialog: () => { throw new Error('Readonly cards must not mount editing dialogs'); } }));
import { TableCard } from './TableCard';

const table: TableWithGuestCount = { id: 'table', user_id: 'owner', event_id: 'event', name: 'Garden', limit_seats: 4, table_purpose: 'standard', head_seating_order: [], created_at: '2026-09-12T00:00:00Z', updated_at: '2026-09-12T00:00:00Z', guest_count: 2 };
const guests = [
  { id: 'second', table_id: 'table', first_name: 'Élodie', last_name: 'O’Connor', seat_no: 2 },
  { id: 'first', table_id: 'table', first_name: 'Jean-Luc', last_name: 'Martin', seat_no: 1 },
].map(guest => ({ ...guest, created_at: '2026-09-12T00:00:00Z', display_order: null } as Guest));

describe('saved readonly table cards', () => {
  it('keeps capacity and seat ordering without drag handles or mutation actions', () => {
    const onEdit = vi.fn(), onDelete = vi.fn(), onSaveHeadSeating = vi.fn();
    const { container } = render(<TableCard readOnly table={table} guests={guests} eventId="event" onEdit={onEdit} onDelete={onDelete} onSaveHeadSeating={onSaveHeadSeating} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect([...container.querySelectorAll('.ww-table-guest-chip')].map(node => node.textContent)).toEqual(['Jean-Luc Martin (Seat 1)', 'Élodie O’Connor (Seat 2)']);
    expect(container.querySelector('[aria-grabbed]')).toBeNull();
    for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); fireEvent.click(button); }
    expect(onEdit).not.toHaveBeenCalled(); expect(onDelete).not.toHaveBeenCalled(); expect(onSaveHeadSeating).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
  it('preserves recorded head-table occupants while excluding the seating dialog', () => {
    render(<TableCard readOnly table={{ ...table, table_purpose: 'head', head_seating_order: [{ kind: 'guest', guest_id: 'second' }] }} guests={guests} eventId="event" onEdit={vi.fn()} onDelete={vi.fn()} onSaveHeadSeating={vi.fn()} />);
    expect(screen.getByText('Élodie O’Connor')).toBeInTheDocument();
    expect(screen.getByText('1 occupied · 3 available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arrange Head Table Seating' })).toBeDisabled();
  });
});
