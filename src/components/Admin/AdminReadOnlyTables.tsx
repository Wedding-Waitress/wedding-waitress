import { TableCard } from '@/components/Dashboard/TableCard';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { Guest } from '@/hooks/useGuests';
import { parseHeadSeatingOrder } from '@/lib/headTable';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const nullableInteger = (value: unknown) => value === null || Number.isSafeInteger(value);

function ownedTables(value: unknown, owner: string, event: string): value is TableWithGuestCount[] {
  return Array.isArray(value) && new Set(value.map(row => row?.id)).size === value.length && value.every(row => record(row)
    && row.user_id === owner && row.event_id === event && typeof row.id === 'string' && typeof row.name === 'string'
    && Number.isSafeInteger(row.limit_seats) && Number(row.limit_seats) > 0
    && Number.isSafeInteger(row.guest_count) && Number(row.guest_count) >= 0 && nullableInteger(row.table_no)
    && ['round', 'square', 'long', null].includes(row.table_type as string | null)
    && (row.notes === null || typeof row.notes === 'string') && date(row.created_at) && date(row.updated_at)
    && (row.table_purpose === 'standard' || row.table_purpose === 'head') && Array.isArray(row.head_seating_order)
    && JSON.stringify(parseHeadSeatingOrder(row.head_seating_order)) === JSON.stringify(row.head_seating_order));
}
function ownedGuests(value: unknown, owner: string, event: string): value is Guest[] {
  return Array.isArray(value) && new Set(value.map(row => row?.id)).size === value.length && value.every(row => record(row)
    && row.user_id === owner && row.event_id === event && typeof row.id === 'string'
    && typeof row.first_name === 'string' && typeof row.last_name === 'string'
    && (row.table_id === null || typeof row.table_id === 'string') && nullableInteger(row.seat_no)
    && nullableInteger(row.display_order) && date(row.created_at));
}
export function AdminReadOnlyTables({ ownerId, eventId, tables, guests, participant1, participant2 }: {
  ownerId: string; eventId: string; tables: unknown; guests: unknown; participant1?: string | null; participant2?: string | null;
}) {
  if (!ownedTables(tables, ownerId, eventId) || !ownedGuests(guests, ownerId, eventId)
    || tables.some(table => table.guest_count !== guests.filter(guest => guest.table_id === table.id).length
      || table.head_seating_order.some(entry => entry.kind === 'guest' && !guests.some(guest => guest.id === entry.guest_id)))) {
    return <p>Complete owned table seating records are unavailable. Missing capacity or seating history has not been invented.</p>;
  }
  if (!tables.length) return <p>No tables recorded.</p>;
  const sorted = [...tables].sort((a, b) => a.table_purpose === 'head' && b.table_purpose !== 'head' ? -1
    : b.table_purpose === 'head' && a.table_purpose !== 'head' ? 1
    : a.table_no === null && b.table_no !== null ? -1 : b.table_no === null && a.table_no !== null ? 1
    : a.table_no !== null && b.table_no !== null ? a.table_no - b.table_no : a.name.localeCompare(b.name));
  return <section aria-label="Read-only saved tables"><p>Saved table seating. Editing, deletion and drag-and-drop are disabled.</p>
    <div className="grid grid-cols-1 items-start sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {sorted.map(table => <TableCard key={table.id} readOnly table={table} guests={guests} eventId={eventId}
        participant1={participant1} participant2={participant2} onEdit={() => undefined} onDelete={async () => false} onSaveHeadSeating={async () => false} />)}
    </div>
  </section>;
}
