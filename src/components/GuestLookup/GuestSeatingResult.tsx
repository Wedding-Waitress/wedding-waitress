import React, { useCallback, useState } from 'react';
import { TableVisualization, type TableAssignmentSummary } from '@/components/GuestLookup/TableVisualization';

interface GuestSeatingResultProps {
  guest: { id: string; first_name: string; last_name: string; table_id: string | null; table_no: number | null; seat_no?: number | null; table_name?: string };
  eventId: string;
  copy: readonly string[];
}

export const GuestSeatingResult: React.FC<GuestSeatingResultProps> = ({ guest, eventId, copy }) => {
  const [loadedTable, setTable] = useState<{ eventId: string; tableId: string | null; summary: TableAssignmentSummary | null } | null>(null);
  const receiveTable = useCallback((summary: TableAssignmentSummary | null) => {
    setTable({ eventId, tableId: guest.table_id, summary });
  }, [eventId, guest.table_id]);
  // Never carry a previous event/table's assignment into a new search result.
  const table = loadedTable?.eventId === eventId && loadedTable.tableId === guest.table_id ? loadedTable.summary : null;
  // A saved name is a valid assignment even when the optional numeric field is blank.
  // Once loaded, use the same table record and seat values as the diagram.
  const tableNumber = table ? table.tableNumber : guest.table_no;
  const tableName = (table ? table.tableName : guest.table_name)?.trim();
  const tableLabel = tableName
    ? (tableNumber != null && tableName !== String(tableNumber) && tableName.toLowerCase() !== `table ${tableNumber}`
      ? `${copy[3]} ${tableNumber} – ${tableName}`
      : tableNumber != null ? `${copy[3]} ${tableNumber}` : tableName)
    : tableNumber != null ? `${copy[3]} ${tableNumber}` : copy[5];
  const seat = table && Object.prototype.hasOwnProperty.call(table.seats, guest.id) ? table.seats[guest.id] : guest.seat_no;
  const assignmentBox: React.CSSProperties = { border: '1px solid var(--qr-guest-line, #b89a70)', background: 'var(--qr-guest-paper, #fff9f0)', padding: '15px 14px', textAlign: 'center', minWidth: 0, overflowWrap: 'anywhere' };
  return <section data-guest-seating-result className="space-y-4">
    <dl data-seating-assignment style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12, margin: '16px 0' }}>
      <div className="ww-box card-elevated" style={assignmentBox}><dt style={{ color: '#000', fontSize: 20, marginBottom: 8 }}>{copy[1]}</dt><dd data-guest-table style={{ margin: 0, fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}>{tableLabel}</dd></div>
      <div className="ww-box card-elevated" style={assignmentBox}><dt style={{ color: '#000', fontSize: 20, marginBottom: 8 }}>{copy[2]}</dt><dd data-guest-seat style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{seat != null ? <>{copy[4]} {seat}</> : copy[5]}</dd></div>
    </dl>
    {guest.table_id ? <TableVisualization tableId={guest.table_id} tableNumber={tableNumber ?? 0} eventId={eventId} selectedGuestId={guest.id} onTableReady={receiveTable} /> : <p role="status" className="text-center py-6">{copy[6]}</p>}
    <div data-guest-organizer-contact role="note" className="ww-box card-elevated" style={{ ...assignmentBox, marginTop: 18, padding: 18, lineHeight: 1.55 }}><div style={{ fontWeight: 600 }}>{copy[7]}</div><div>{copy[8]}</div></div>
  </section>;
};
