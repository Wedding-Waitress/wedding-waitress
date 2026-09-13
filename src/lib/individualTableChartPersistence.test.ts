import { describe, expect, it } from 'vitest';
import { individualChartScopeKey, parseIndividualChartSavedSnapshot, parsePersistedIndividualChartSettings, snapshotIndividualChartSettings } from './individualTableChartPersistence';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const event = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const settings = {
  tableShape: 'long' as const, fontSize: 'large' as const, guestTextSize: 'small' as const,
  includeNames: true, includeDietary: false, includeRelation: true, includeGuestList: false,
  showSeatNumbers: false, isBold: true, isItalic: true, isUnderline: false, largerTableNames: true,
  showLogo: false, enableEndSeats: true, endSeatsCount: 1 as const, paperSize: 'A4' as const,
  guestNameColor: '#000000' as const, seatNumberColor: '#C62828' as const, guestListColor: '#1565C0' as const,
  dietaryColor: '#2E7D32' as const, relationshipColor: '#967A59' as const,
};

describe('owner/event-scoped Individual Table Chart snapshots', () => {
  it('preserves every actual style value, including false flags, without defaults', () => {
    expect(parsePersistedIndividualChartSettings(settings)).toEqual(settings);
    expect(parsePersistedIndividualChartSettings({})).toBeNull();
    expect(parsePersistedIndividualChartSettings(null)).toBeNull();
  });
  it.each(['tableShape', 'guestTextSize', 'guestNameColor', 'includeNames', 'paperSize', 'endSeatsCount'])('rejects missing or invalid %s rather than inventing historical style', key => {
    const partial: Record<string, unknown> = { ...settings };
    delete partial[key];
    expect(parsePersistedIndividualChartSettings(partial)).toBeNull();
    expect(parsePersistedIndividualChartSettings({ ...settings, [key]: 'invalid' })).toBeNull();
  });
  it('does not persist generated table titles or export-pagination values', () => {
    expect(snapshotIndividualChartSettings({ ...settings, title: 'TABLE 9', totalTables: 10, currentTableIndex: 9 })).toEqual(settings);
    expect(parsePersistedIndividualChartSettings({ ...settings, title: 'TABLE 9' })).toBeNull();
  });
  it('separates owners and events, rejecting anonymous or malformed scope', () => {
    expect(individualChartScopeKey(owner, event)).not.toBe(individualChartScopeKey(event, owner));
    expect(individualChartScopeKey('', event)).toBeNull();
    expect(individualChartScopeKey(owner, '../event')).toBeNull();
    expect(individualChartScopeKey(owner, event)).not.toBe('ww:individual_table_chart_settings');
  });
  it('accepts only the exact requested owner/event and a real saved revision', () => {
    const row = { user_id: owner, event_id: event, revision: 1, settings };
    expect(parseIndividualChartSavedSnapshot(row, owner, event)).toEqual(row);
    expect(parseIndividualChartSavedSnapshot(row, event, owner)).toBeNull();
    expect(parseIndividualChartSavedSnapshot({ ...row, revision: 0 }, owner, event)).toBeNull();
    expect(parseIndividualChartSavedSnapshot({ ...row, revision: 1.5 }, owner, event)).toBeNull();
    expect(parseIndividualChartSavedSnapshot({ ...row, settings: {} }, owner, event)).toBeNull();
  });
});
