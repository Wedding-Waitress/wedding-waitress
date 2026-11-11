import React, { useCallback, useState } from 'react';
import { TableVisualization, type TableAssignmentSummary } from '@/components/GuestLookup/TableVisualization';

interface GuestSeatingResultProps {
  guest: { id: string; first_name: string; last_name: string; table_id: string | null; table_no: number | null; seat_no?: number | null; table_name?: string };
  eventId: string;
  copy: readonly string[];
}

export const GuestSeatingResult: React.FC<GuestSeatingResultProps> = ({ guest, eventId, copy }) => {
  const [table, setTable] = useState<TableAssignmentSummary | null>(null);
  const receiveTable = useCallback((summary: TableAssignmentSummary | null) => setTable(summary), []);
  const tableNumber = table?.tableNumber ?? guest.table_no;
  const tableName = table?.tableName || guest.table_name;
  const seat = table?.seats[guest.id] ?? guest.seat_no;
  const box: React.CSSProperties = { border: '1px solid rgba(167,128,77,.7)', borderRadius: 10, background: 'rgba(0,0,0,.28)', padding: '15px 14px', textAlign: 'center', minWidth: 0 };
  return <section data-guest-seating-result className="space-y-4">
    <div className="text-center font-semibold text-lg" data-seating-guest-name>{guest.first_name} {guest.last_name}</div>
    <dl data-seating-assignment style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(100px, .45fr)', gap: 12, margin: '16px 0' }}>
      <div style={box}><dt style={{ color: '#cfb58f', fontSize: 13, marginBottom: 8 }}>{copy[1]}</dt><dd data-guest-table style={{ margin: 0, fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}>{tableNumber != null ? <>{copy[3]} {tableNumber}{tableName ? ` – ${tableName}` : ''}</> : copy[5]}</dd></div>
      <div style={box}><dt style={{ color: '#cfb58f', fontSize: 13, marginBottom: 8 }}>{copy[2]}</dt><dd data-guest-seat style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{seat != null ? <>{copy[4]} {seat}</> : copy[5]}</dd></div>
    </dl>
    {guest.table_id ? <TableVisualization tableId={guest.table_id} tableNumber={tableNumber ?? 0} eventId={eventId} onTableReady={receiveTable} /> : <p role="status" className="text-center py-6">{copy[6]}</p>}
    <div data-guest-organizer-contact role="note" style={{ ...box, marginTop: 18, padding: 18, lineHeight: 1.55 }}><div style={{ fontWeight: 600 }}>{copy[7]}</div><div>{copy[8]}</div></div>
  </section>;
};
