import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IndividualTableChartPreview } from '@/components/Dashboard/IndividualTableChart/IndividualTableChartPreview';
import { parseIndividualChartSavedSnapshot } from '@/lib/individualTableChartPersistence';
import { individualChartCapacityError } from '@/lib/individualTableChartValidation';
import type { Guest } from '@/hooks/useGuests';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { AdminPreviewDocumentEvent } from './AdminReadOnlyCeremonyPlan';

interface Props {
  ownerId: string; eventId: string; event: AdminPreviewDocumentEvent;
  snapshot: unknown; tables: unknown[]; guests: unknown[];
}

export function AdminReadOnlyIndividualCharts({ ownerId, eventId, event, snapshot, tables, guests }: Props) {
  const [selectedTableId, setSelectedTableId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = parseIndividualChartSavedSnapshot(snapshot, ownerId, eventId);
  if (!saved) return <p>No synchronized Individual Table Chart style is recorded. Historical browser-only customization is unavailable; the administrator’s settings and default styles have not been substituted.</p>;
  const completeTables = tables.every(value => value && typeof value === 'object'
    && typeof (value as any).id === 'string' && typeof (value as any).name === 'string'
    && Number.isSafeInteger((value as any).limit_seats) && (value as any).limit_seats > 0
    && ['standard', 'head'].includes((value as any).table_purpose) && Array.isArray((value as any).head_seating_order));
  const completeGuests = guests.every(value => value && typeof value === 'object'
    && ['id', 'first_name', 'last_name'].every(key => typeof (value as any)[key] === 'string')
    && ['table_id', 'seat_no', 'dietary', 'relation_display', 'display_order'].every(key => key in value));
  if (!completeTables || !completeGuests) return <p role="alert">Complete saved chart content is unavailable. No partial printable chart was substituted.</p>;
  const orderedTables = (tables as TableWithGuestCount[]).slice().sort((a, b) => {
    if (a.table_purpose !== b.table_purpose) return a.table_purpose === 'head' ? -1 : 1;
    if (a.table_no === null && b.table_no !== null) return -1;
    if (a.table_no !== null && b.table_no === null) return 1;
    return a.table_no === null && b.table_no === null ? a.name.localeCompare(b.name) : (a.table_no ?? 0) - (b.table_no ?? 0);
  });
  if (!orderedTables.length) return <p>No tables recorded.</p>;
  const table = orderedTables.find(item => item.id === selectedTableId) ?? orderedTables[0];
  const settings = { ...saved.settings, title: `TABLE ${table.table_no || 'Unknown'}` };
  const index = orderedTables.indexOf(table) + 1;
  const capacityError = individualChartCapacityError(settings, table, guests as Guest[]);
  return <section aria-label="Read-only Individual Table Charts">
    <label>Table <select value={table.id} onChange={value => { setSelectedTableId(value.target.value); setError(null); }}>
      {orderedTables.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    {capacityError ? <p role="alert">{capacityError}</p> : <>
      <Button type="button" disabled={exporting} onClick={() => {
        setExporting(true); setError(null);
        void (async () => {
          try {
            const [{ generateIndividualTableChartPDF }, { savePdfBlobAsync }] = await Promise.all([
              import('@/lib/individualTableChartEngine'), import('@/lib/pdfExportUtils'),
            ]);
            const pdf = await generateIndividualTableChartPDF(settings, table, guests as Guest[], event, index, orderedTables.length);
            await savePdfBlobAsync(pdf, 'Individual-Table-Chart-read-only.pdf');
          } catch { setError('The saved chart could not be exported.'); }
          finally { setExporting(false); }
        })();
      }}>{exporting ? 'Preparing PDF…' : 'Download saved chart PDF'}</Button>
      {error && <p role="alert">{error}</p>}
      <IndividualTableChartPreview settings={settings} table={table} guests={guests as Guest[]}
        event={event} currentTableIndex={index} totalTables={orderedTables.length} />
    </>}
  </section>;
}
