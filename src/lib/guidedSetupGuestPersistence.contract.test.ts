import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const guided = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/guidedEventSetup.ts'), 'utf8');
const guestList = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Dashboard/GuestListTable.tsx'), 'utf8');
const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260902153756_add_guided_setup_guest_origins.sql'),
  'utf8',
);
const imports = ['first_name', 'last_name', 'table_name', 'seat_no', 'rsvp', 'dietary', 'mobile', 'email', 'notes'];

describe('Guided Setup guest integration contract', () => {
  it('provisions automatic guests and preserves selected-event navigation', () => {
    expect(guided).toContain('reconcileGuidedSetupGuests');
    expect(guided).toContain('setSelectedEventId(eventId)');
    expect(guided).not.toContain('expectedAttending +');
  });

  it('does not expose the internal source key through existing import or export columns', () => {
    for (const field of imports) expect(guestList).toContain(`'${field}'`);
    expect(guestList).not.toMatch(/IMPORT_TEMPLATE_HEADERS[\s\S]{0,500}guided_setup_origin/);
    expect(guestList).not.toMatch(/EXPORT_HEADERS[\s\S]{0,500}guided_setup_origin/);
  });

  it('preserves existing edit, delete, filter, sort and table-assignment paths', () => {
    expect(guestList).toContain('handleEditGuest');
    expect(guestList).toContain('deleteGuest');
    expect(guestList).toContain('const groupedGuests = useMemo');
    expect(guestList).toContain('handleBulkTableAssignment');
  });

  it('defines a constrained per-event origin without weakening guest RLS', () => {
    expect(migration).toContain('add column guided_setup_origin text');
    expect(migration).toContain('guests_guided_setup_origin_check');
    for (const origin of [
      'wedding_couple_1',
      'wedding_couple_2',
      'engagement_couple_1',
      'engagement_couple_2',
      'birthday_celebrant',
    ]) expect(migration).toContain(`'${origin}'`);
    expect(migration).toMatch(/unique index guests_event_guided_setup_origin_unique[\s\S]*\(event_id, guided_setup_origin\)[\s\S]*where guided_setup_origin is not null/i);
    expect(migration).toContain('drop index if exists public.uniq_guest_name_per_event');
    expect(migration).toMatch(/create index guests_event_normalized_name_idx/i);
    expect(migration).not.toMatch(/create policy|drop policy|alter policy|disable row level security/i);
  });
});
