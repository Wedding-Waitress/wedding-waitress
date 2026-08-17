import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const hook = read('src/hooks/useFullSeatingChartSettings.ts');
const page = read('src/components/Dashboard/FullSeatingChart/FullSeatingChartPage.tsx');
const preview = read('src/components/Dashboard/FullSeatingChart/FullSeatingChartPreview.tsx');
const exporter = read('src/lib/fullSeatingChartPdfExporter.ts');
const migration = read('supabase/migrations/20260812101500_add_full_seating_chart_display_options.sql');

const fields = [
  'showGuestNames', 'showSeatNumbers', 'showGuestList', 'showDietary', 'showRelation',
  'guestNameColor', 'seatNumberColor', 'guestListColor', 'dietaryColor', 'relationshipColor',
];

describe('Full Seating Chart display-option integration', () => {
  it('passes the same complete settings object to live preview and both PDF actions', () => {
    expect(page).toContain('settings={settings}');
    expect(page.match(/exportFullSeatingChartToPdf\([^;]+settings/g)?.length).toBe(2);
    fields.forEach(field => {
      expect(preview).toContain(`settings.${field}`);
      expect(exporter).toContain(`settings.${field}`);
    });
  });

  it('persists all display settings per event and user', () => {
    expect(hook).toContain(".eq('event_id', eventId)");
    expect(hook).toContain("onConflict: 'event_id,user_id'");
    for (const column of [
      'show_guest_names', 'show_seat_numbers', 'show_guest_list',
      'guest_name_color', 'seat_number_color', 'guest_list_color',
      'dietary_color', 'relationship_color',
    ]) {
      expect(hook).toContain(`${column}:`);
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    }
  });
});
