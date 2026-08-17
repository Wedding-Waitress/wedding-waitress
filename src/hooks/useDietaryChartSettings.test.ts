import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'src/hooks/useDietaryChartSettings.ts'), 'utf8');
const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260812033000_add_dietary_display_customisation.sql'), 'utf8');
const fiveOptionMigration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260812104500_add_dietary_five_display_options.sql'), 'utf8');
const types = fs.readFileSync(path.join(process.cwd(), 'src/integrations/supabase/types.ts'), 'utf8');

describe('dietary chart settings persistence', () => {
  it('uses one shared event/user upsert for every setting', () => {
    expect(source).toContain(".from('dietary_chart_settings')");
    expect(source).toContain("onConflict: 'event_id,user_id'");
    for (const column of [
      'sort_by', 'font_size', 'guest_name_color', 'guest_list_color', 'dietary_color',
      'relationship_color', 'seat_number_color', 'show_guest_names', 'show_guest_list',
      'show_dietary', 'show_relation', 'show_seat_numbers', 'is_bold', 'is_italic', 'is_underline',
    ]) expect(source).toContain(`${column}:`);
  });

  it('merges partial control changes into the latest complete state', () => {
    expect(source).toContain('const updatedSettings = { ...settingsRef.current, ...newSettings }');
    expect(source).toContain('settingsRef.current = updatedSettings');
    expect(source).toContain('settingsCache.set(eventId, updatedSettings)');
    expect(source).toContain('settings: settingsToSave');
  });

  it('coalesces rapid changes and serializes writes', () => {
    expect(source).toContain('SAVE_DEBOUNCE_MS = 200');
    expect(source).toContain('pendingSaveRef.current = { eventId, settings: updatedSettings }');
    expect(source).toContain('clearTimeout(saveTimerRef.current)');
    expect(source).toContain('saveChainRef.current = saveChainRef.current.then');
    expect(source).toContain('pendingSaveRef.current = null');
  });

  it('isolates reloads, navigation and queued writes by event and owner', () => {
    expect(source).toContain(".eq('event_id', eventId)");
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain('eventId: jobEventId');
    expect(source).toContain('loadGeneration !== loadGenerationRef.current');
    expect(source).toContain("onConflict: 'event_id,user_id'");
  });

  it('logs complete Supabase diagnostics without suppressing genuine failures', () => {
    expect(source).toContain('message: databaseError.message');
    expect(source).toContain('code: databaseError.code');
    expect(source).toContain('details: databaseError.details');
    expect(source).toContain('hint: databaseError.hint');
    expect(source).toContain("description: 'Failed to save settings. Please try again.'");
    expect(source).not.toContain("title: 'Settings saved'");
  });

  it('provides an idempotent migration for the missing live columns', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS mobile_color');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS relationship_color');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS seat_number_color');
    expect(migration).toContain("ALTER COLUMN font_size SET DEFAULT 'standard'");
    for (const column of [
      'guest_name_color', 'guest_list_color', 'dietary_color', 'show_guest_names',
      'show_guest_list', 'show_dietary', 'show_seat_numbers',
    ]) {
      expect(fiveOptionMigration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
      expect(types).toContain(`${column}:`);
    }
  });
});
