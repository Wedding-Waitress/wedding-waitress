import type { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { Guest } from '@/hooks/useGuests';
export function individualChartCapacityError(settings: IndividualChartSettings, table: TableWithGuestCount, guests: Guest[]): string | null {
  if (table.table_purpose === 'head') return null;
  const count = Math.max(table.limit_seats || 0, guests.filter(g => g.table_id === table.id).length);
  const limit = settings.tableShape === 'long' ? 42 : 20;
  if (count <= limit) return null;
  return settings.tableShape === 'long'
    ? `Table ${table.table_no ?? table.name} exceeds the 42-guest limit. Reduce its capacity or split it into smaller tables before exporting.`
    : `Table ${table.table_no ?? table.name} exceeds the 20-guest limit for Round and Square. Choose Long Table before exporting.`;
}
