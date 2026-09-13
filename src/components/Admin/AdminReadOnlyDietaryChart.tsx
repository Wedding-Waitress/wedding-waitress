import { useMemo } from 'react';
import { KitchenDietaryChartView } from '@/components/Dashboard/QRCode/KitchenDietaryChart';
import { dietaryChartSettingsFromRow } from '@/hooks/useDietaryChartSettings';
import type { Guest } from '@/hooks/useGuests';
import type { Event } from '@/hooks/useEvents';
import type { TableWithGuestCount } from '@/hooks/useTables';
import type { AdminPreviewDocumentEvent } from './AdminReadOnlyCeremonyPlan';

interface Props { ownerId: string; eventId: string; event: AdminPreviewDocumentEvent; savedSettings: unknown;
  guests: unknown[]; tables: unknown[]; }
export function AdminReadOnlyDietaryChart({ ownerId, eventId, event, savedSettings, guests, tables }: Props) {
  const row = savedSettings as Record<string, unknown> | null;
  const actualEvent = useMemo(() => ({ ...event, id: eventId, user_id: ownerId }) as Event, [event, eventId, ownerId]);
  const events = useMemo(() => [actualEvent], [actualEvent]);
  const settings = useMemo(() => row && row.user_id === ownerId && row.event_id === eventId
    ? dietaryChartSettingsFromRow(row) : null, [row, ownerId, eventId]);
  if (!settings) return <p>No saved Dietary Requirements customization is available. A default customer report has not been substituted.</p>;
  const nullableText = (value: unknown) => value === null || typeof value === 'string';
  const nullableInteger = (value: unknown) => value === null || Number.isSafeInteger(value);
  const nullableBoolean = (value: unknown) => value === null || typeof value === 'boolean';
  const required = ['sort_by','font_size','guest_name_color','guest_list_color','dietary_color','relationship_color','seat_number_color',
    'show_guest_names','show_guest_list','show_dietary','show_relation','show_seat_numbers','show_seat_no','show_logo',
    'paper_size','is_bold','is_italic','is_underline'];
  const completeSettings = required.every(key => key in row)
    && ['show_guest_names','show_guest_list','show_dietary','show_relation','show_seat_numbers','show_seat_no','show_logo','is_bold','is_italic','is_underline'].every(key => nullableBoolean(row[key]))
    && ['font_size','guest_name_color','guest_list_color','dietary_color','relationship_color','seat_number_color'].every(key => nullableText(row[key]))
    && typeof settings.showRelation === 'boolean' && typeof settings.showLogo === 'boolean' && typeof settings.showSeatNumbers === 'boolean';
  const completeGuests = guests.every(value => value && typeof value === 'object'
    && ['id','first_name','last_name'].every(key => typeof (value as any)[key] === 'string')
    && ['table_id','dietary','mobile','relation_partner','relation_role'].every(key => nullableText((value as any)[key]))
    && ['table_no','seat_no'].every(key => nullableInteger((value as any)[key])));
  const completeTables = tables.every(value => value && typeof value === 'object'
    && typeof (value as any).id === 'string' && typeof (value as any).name === 'string' && nullableInteger((value as any).table_no));
  if (!completeSettings || !completeGuests || !completeTables || !['firstName','lastName','tableNo','dietary'].includes(settings.sortBy)
    || !['A4','A3','A2','A1'].includes(settings.paperSize)
    || settings.showRelation && !['partner1_name','partner2_name'].every(key => key in event)) {
    return <p role="alert">Complete saved Dietary Requirements content is unavailable.</p>;
  }
  return <section aria-label="Read-only saved Dietary Requirements">
    <KitchenDietaryChartView eventId={eventId} events={events} guests={guests as Guest[]}
      tables={tables as TableWithGuestCount[]} settings={settings} readOnly />
  </section>;
}
