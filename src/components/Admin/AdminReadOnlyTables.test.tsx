import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
vi.mock('@/components/Dashboard/TableCard', () => ({ TableCard: (props: any) => <div data-testid="saved-table" data-readonly={String(props.readOnly)}>{props.table.name}: {props.table.guest_count}</div> }));
import { AdminReadOnlyTables } from './AdminReadOnlyTables';
const table = { id: 'table', user_id: 'owner', event_id: 'event', name: 'Garden', limit_seats: 4, guest_count: 1, table_no: 1, table_type: 'round', table_purpose: 'standard', notes: null, head_seating_order: [], created_at: '2026-09-12T00:00:00Z', updated_at: '2026-09-12T00:00:00Z' };
const guest = { id: 'guest', user_id: 'owner', event_id: 'event', first_name: 'Élodie', last_name: 'O’Connor', table_id: 'table', seat_no: 1, display_order: null, created_at: '2026-09-12T00:00:00Z' };
describe('audited owned table adapter', () => {
  it('uses actual owned capacity with readonly existing cards', () => {
    render(<AdminReadOnlyTables ownerId="owner" eventId="event" tables={[table]} guests={[guest]} />);
    expect(screen.getByTestId('saved-table')).toHaveAttribute('data-readonly', 'true');
    expect(screen.getByText('Garden: 1')).toBeInTheDocument();
  });
  it.each([
    { ...table, user_id: 'foreign' }, { ...table, event_id: 'other' }, { ...table, guest_count: 2 },
    { ...table, limit_seats: undefined }, { ...table, head_seating_order: [{ kind: 'guest', guest_id: 'missing' }] },
    { ...table, table_purpose: 'head', head_seating_order: [{ kind: 'participant', participant: 'invented' }] },
  ])('fails closed for missing, inconsistent or foreign source (%j)', candidate => {
    render(<AdminReadOnlyTables ownerId="owner" eventId="event" tables={[candidate]} guests={[guest]} />);
    expect(screen.queryByTestId('saved-table')).not.toBeInTheDocument();
    expect(screen.getByText(/seating history has not been invented/)).toBeInTheDocument();
  });
  it('rejects foreign guest data and duplicate tables', () => {
    render(<AdminReadOnlyTables ownerId="owner" eventId="event" tables={[table, table]} guests={[{ ...guest, user_id: 'foreign' }]} />);
    expect(screen.queryByTestId('saved-table')).not.toBeInTheDocument();
  });
});
