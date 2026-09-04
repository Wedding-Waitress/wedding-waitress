import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260904021242_fix_guest_song_prefill_ambiguity.sql';
const rollbackPath = 'supabase/rollback/20260904021242_fix_guest_song_prefill_ambiguity.rollback.sql';

const migration = readFileSync(migrationPath, 'utf8');
const rollback = readFileSync(rollbackPath, 'utf8');

describe('guest-song prefill RPC migration', () => {
  it('preserves the frontend RPC signature and response contract', () => {
    expect(migration).toContain('public.get_guest_song_requests_for_guest(');
    expect(migration).toContain('_event_id uuid');
    expect(migration).toContain('_guest_id uuid');
    for (const field of ['id uuid', 'slot_index integer', 'song_title text', 'artist_name text', 'music_link text', 'note text', 'status text']) {
      expect(migration).toContain(field);
    }
  });

  it('uses explicit, fully-qualified SQL rather than variable-conflict suppression', () => {
    expect(migration).toMatch(/LANGUAGE sql/i);
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain('FROM public.guest_song_requests AS request');
    expect(migration).toContain('FROM public.events AS event_row');
    expect(migration).toContain('JOIN public.guests AS guest_row');
    expect(migration).toContain('JOIN public.guest_song_request_settings AS setting_row');
    expect(migration).not.toMatch(/variable_conflict/i);
  });

  it('requires the matching guest, live-view event, and enabled song feature', () => {
    expect(migration).toContain('guest_row.event_id = event_row.id');
    expect(migration).toContain('guest_row.id = _guest_id');
    expect(migration).toContain('event_row.id = _event_id');
    expect(migration).toContain('event_row.qr_apply_to_live_view IS TRUE');
    expect(migration).toContain('setting_row.enabled IS TRUE');
  });

  it('revokes implicit public execution and grants only established API roles', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION[\s\S]+FROM PUBLIC;/i);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]+TO anon, authenticated;/i);
    expect(migration).not.toMatch(/TO service_role/i);
  });

  it('provides a rollback to the immediately previous definition and permissions', () => {
    expect(rollback).toMatch(/LANGUAGE plpgsql/i);
    expect(rollback).toContain("SET search_path TO 'public'");
    expect(rollback).toContain('SELECT 1 FROM events WHERE id = _event_id');
    expect(rollback).toContain('SELECT 1 FROM guests WHERE id = _guest_id');
    expect(rollback).toMatch(/GRANT EXECUTE ON FUNCTION[\s\S]+TO PUBLIC;/i);
  });
});
