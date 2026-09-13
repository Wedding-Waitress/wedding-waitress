import type { IndividualChartSettings } from '@/components/Dashboard/IndividualTableChart/IndividualTableSeatingChartPage';
import { DIETARY_ACCENT_COLORS } from '@/lib/dietaryChartSettings';

/** A saved snapshot is evidence, not an invitation to fill unknown history with defaults. */
export type PersistedIndividualChartSettings = Omit<IndividualChartSettings, 'title' | 'totalTables' | 'currentTableIndex'>;

const booleanKeys = [
  'includeNames', 'includeDietary', 'includeRelation', 'includeGuestList',
  'showSeatNumbers', 'isBold', 'isItalic', 'isUnderline', 'largerTableNames',
  'showLogo', 'enableEndSeats',
] as const;
const colorKeys = ['guestNameColor', 'seatNumberColor', 'guestListColor', 'dietaryColor', 'relationshipColor'] as const;
const allowedKeys = new Set<string>([
  ...booleanKeys, ...colorKeys, 'tableShape', 'fontSize', 'guestTextSize', 'paperSize', 'endSeatsCount',
]);

export function parsePersistedIndividualChartSettings(value: unknown): PersistedIndividualChartSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const settings = value as Record<string, unknown>;
  if (Object.keys(settings).some(key => !allowedKeys.has(key))) return null;
  if (booleanKeys.some(key => typeof settings[key] !== 'boolean')) return null;
  if (colorKeys.some(key => !DIETARY_ACCENT_COLORS.includes(settings[key] as typeof DIETARY_ACCENT_COLORS[number]))) return null;
  if (!['round', 'square', 'long'].includes(settings.tableShape as string)
    || !['small', 'medium', 'large'].includes(settings.fontSize as string)
    || !['small', 'standard', 'large'].includes(settings.guestTextSize as string)
    || settings.paperSize !== 'A4' || settings.endSeatsCount !== 1) return null;
  return { ...settings } as PersistedIndividualChartSettings;
}

/** Only an explicit current-owner save/edit may call this; never import the old global browser key. */
export function snapshotIndividualChartSettings(settings: IndividualChartSettings): PersistedIndividualChartSettings | null {
  const { title: _title, totalTables: _total, currentTableIndex: _index, ...style } = settings;
  return parsePersistedIndividualChartSettings(style);
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function individualChartScopeKey(ownerId: string, eventId: string): string | null {
  if (!uuid.test(ownerId) || !uuid.test(eventId)) return null;
  return `ww:individual_table_chart:v1:${ownerId.toLowerCase()}:${eventId.toLowerCase()}`;
}

export interface IndividualChartSavedSnapshot {
  event_id: string;
  user_id: string;
  revision: number;
  settings: PersistedIndividualChartSettings;
}

export function parseIndividualChartSavedSnapshot(value: unknown, ownerId: string, eventId: string): IndividualChartSavedSnapshot | null {
  if (!individualChartScopeKey(ownerId, eventId) || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.user_id !== ownerId || row.event_id !== eventId
    || !Number.isSafeInteger(row.revision) || (row.revision as number) < 1) return null;
  const settings = parsePersistedIndividualChartSettings(row.settings);
  return settings ? { user_id: ownerId, event_id: eventId, revision: row.revision as number, settings } : null;
}
