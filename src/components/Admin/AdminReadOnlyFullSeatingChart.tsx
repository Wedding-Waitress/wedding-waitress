import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FullSeatingChartPreview, type FullSeatingChartPreviewHandle } from '@/components/Dashboard/FullSeatingChart/FullSeatingChartPreview';
import { fullSeatingChartSettingsFromRow } from '@/hooks/useFullSeatingChartSettings';
import type { Guest } from '@/hooks/useGuests';
import type { AdminPreviewDocumentEvent } from './AdminReadOnlyCeremonyPlan';

interface Props { ownerId: string; eventId: string; event: AdminPreviewDocumentEvent; savedSettings: unknown; guests: unknown[]; tables: unknown[]; }
export function AdminReadOnlyFullSeatingChart({ ownerId, eventId, event, savedSettings, guests, tables }: Props) {
  const preview = useRef<FullSeatingChartPreviewHandle>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = savedSettings as Record<string, unknown> | null;
  const settings = useMemo(() => row && row.user_id === ownerId && row.event_id === eventId
    ? fullSeatingChartSettingsFromRow(row) : null, [row, ownerId, eventId]);
  const resolvedGuests = useMemo(() => guests.map(value => {
    if (!value || typeof value !== 'object') return value;
    const guest = value as Guest;
    const table = tables.find(value => value && typeof value === 'object' && (value as any).id === guest.table_id) as any;
    return table ? { ...guest, table_no: table.table_no } : guest;
  }) as Guest[], [guests, tables]);
  const { tableNameMap, tableIdNameMap } = useMemo(() => {
    const tableNameMap: Record<number, string> = {}, tableIdNameMap: Record<string, string> = {};
    for (const value of tables) {
      if (!value || typeof value !== 'object') continue;
      const table = value as any;
      const label = table.name && isNaN(Number(table.name)) ? table.name : `Table ${table.table_no}`;
      tableIdNameMap[table.id] = label;
      if (table.table_no != null) tableNameMap[table.table_no] = label;
    }
    return { tableNameMap, tableIdNameMap };
  }, [tables]);
  if (!settings) return <p>No saved Full Seating Chart customization is available. A default customer chart has not been substituted.</p>;
  const nullableText = (value: unknown) => value === null || typeof value === 'string';
  const nullableInteger = (value: unknown) => value === null || Number.isSafeInteger(value);
  const nullableBoolean = (value: unknown) => value === null || typeof value === 'boolean';
  const completeGuests = guests.every(value => value && typeof value === 'object'
    && ['id', 'first_name', 'last_name'].every(key => typeof (value as any)[key] === 'string')
    && ['table_id', 'dietary', 'rsvp', 'relation_display'].every(key => nullableText((value as any)[key]))
    && ['table_no', 'seat_no', 'display_order'].every(key => nullableInteger((value as any)[key])));
  const completeTables = tables.every(value => value && typeof value === 'object'
    && typeof (value as any).id === 'string' && typeof (value as any).name === 'string' && nullableInteger((value as any).table_no));
  const completeSettings = ['sort_by','font_size','show_dietary','show_rsvp','show_relation','paper_size',
    'show_guest_names','show_seat_numbers','show_guest_list','guest_name_color','seat_number_color','guest_list_color',
    'dietary_color','relationship_color','show_logo','is_bold','is_italic','is_underline'].every(key => key in row)
    && ['show_dietary','show_rsvp','show_relation'].every(key => typeof row[key] === 'boolean')
    && ['show_guest_names','show_seat_numbers','show_guest_list','show_logo','is_bold','is_italic','is_underline'].every(key => nullableBoolean(row[key]))
    && ['font_size','guest_name_color','seat_number_color','guest_list_color','dietary_color','relationship_color'].every(key => nullableText(row[key]));
  if (!completeSettings || !completeGuests || !completeTables || !['firstName', 'lastName', 'tableNo'].includes(settings.sortBy)
    || !['A4', 'A3', 'A2', 'A1'].includes(settings.paperSize)) return <p role="alert">Complete saved Full Seating Chart content is unavailable.</p>;
  return <section aria-label="Read-only saved Full Seating Chart">
    <Button type="button" disabled={exporting} onClick={() => {
      setExporting(true); setError(null);
      void (async () => {
        try {
          const handle = preview.current;
          if (!handle) throw new Error('Preview not ready');
          const { exportFullSeatingPreviewPdf } = await import('@/lib/fullSeatingPreviewPdf');
          await exportFullSeatingPreviewPdf({ eventName: event.name, mode: 'all', currentPage: handle.getCurrentPage(),
            pageNumbers: Array.from({ length: handle.getTotalPages() }, (_, index) => index + 1),
            renderPage: handle.renderPage, getPageElement: handle.getPageElement });
        } catch { setError('The saved Full Seating Chart could not be exported.'); }
        finally { setExporting(false); }
      })();
    }}>{exporting ? 'Preparing PDF…' : 'Download saved Full Seating Chart PDF'}</Button>
    {error && <p role="alert">{error}</p>}
    <FullSeatingChartPreview ref={preview} disabled={exporting} readOnly event={event} guests={resolvedGuests} settings={settings}
      tableNameMap={tableNameMap} tableIdNameMap={tableIdNameMap} />
  </section>;
}
