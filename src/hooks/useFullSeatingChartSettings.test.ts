import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'src/hooks/useFullSeatingChartSettings.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260812101500_add_full_seating_chart_display_options.sql'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/integrations/supabase/types.ts'), 'utf8');

const persistedColumns = [
  'sort_by', 'font_size', 'show_dietary', 'show_guest_names', 'show_seat_numbers',
  'show_guest_list', 'show_rsvp', 'show_relation', 'guest_name_color',
  'seat_number_color', 'guest_list_color', 'dietary_color', 'relationship_color',
  'show_logo', 'paper_size', 'is_bold', 'is_italic', 'is_underline',
];

describe('Full Seating Chart settings persistence', () => {
  it('upserts every control through one complete event/user payload', () => {
    expect(source).toContain(".from('full_seating_chart_settings')");
    expect(source).toContain("onConflict: 'event_id,user_id'");
    persistedColumns.forEach(column => expect(source).toContain(`${column}:`));
    expect(source).not.toContain('} as any, {');
  });

  it('merges partial changes into the latest complete optimistic snapshot', () => {
    expect(source).toContain('const updatedSettings = { ...settingsRef.current, ...newSettings }');
    expect(source).toContain('settingsRef.current = updatedSettings');
    expect(source).toContain('settingsCache.set(eventId, updatedSettings)');
  });

  it('coalesces rapid changes and serializes database writes newest-first', () => {
    expect(source).toContain('SAVE_DEBOUNCE_MS = 200');
    expect(source).toContain('pendingSaveRef.current = { eventId, settings: updatedSettings }');
    expect(source).toContain('clearTimeout(saveTimerRef.current)');
    expect(source).toContain('saveChainRef.current = saveChainRef.current.then');
  });

  it('keeps loads and queued saves isolated by event', () => {
    expect(source).toContain(".eq('event_id', eventId)");
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('eventId: jobEventId');
    expect(source).toContain('loadGeneration !== loadGenerationRef.current');
  });

  it('reports genuine Supabase failures with the complete diagnostic body and no false success toast', () => {
    for (const field of ['message', 'code', 'details', 'hint']) {
      expect(source).toContain(`${field}: databaseError.${field}`);
    }
    expect(source).toContain("description: 'Failed to save settings. Please try again.'");
    expect(source).not.toContain("title: 'Settings saved'");
  });

  it('has an idempotent migration and matching generated fields for all new columns', () => {
    for (const column of [
      'show_guest_names', 'show_seat_numbers', 'show_guest_list', 'guest_name_color',
      'seat_number_color', 'guest_list_color', 'dietary_color', 'relationship_color',
    ]) {
      expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
      expect(types).toContain(`${column}:`);
    }
  });
});
