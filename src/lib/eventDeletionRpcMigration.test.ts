import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260821114500_secure_owned_event_deletion.sql',
  'utf8',
);

describe('secure owned-event deletion migration', () => {
  it('uses the authenticated UUID and authoritative events.user_id owner', () => {
    expect(migration).toContain('caller_id uuid := auth.uid()');
    expect(migration).toContain('event_row.user_id = caller_id');
    expect(migration).not.toContain('is_account_master');
    expect(migration).not.toContain('service_role');
  });

  it('rejects unauthenticated users, non-owners, team members, and inactive accounts', () => {
    expect(migration).toContain("IF caller_id IS NULL THEN");
    expect(migration).toContain("Event not found or not owned by the authenticated user");
    expect(migration).toContain('IF NOT public.is_account_operational(caller_id) THEN');
  });

  it('deletes one owner-matched event and returns the exact affected row', () => {
    expect(migration).toMatch(/DELETE FROM public\.events[\s\S]*event_row\.id = p_event_id[\s\S]*event_row\.user_id = caller_id/);
    expect(migration).toContain('RETURNING event_row.id, event_row.user_id');
    expect(migration).toContain("IF deleted_id IS NULL THEN");
  });

  it('is callable only by authenticated clients and never exposes a browser service-role path', () => {
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path = public, pg_temp');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.delete_owned_event_secure(uuid) FROM PUBLIC, anon');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.delete_owned_event_secure(uuid) TO authenticated');
  });

  it('repairs the proven NO ACTION dependency gaps without manually deleting dependent rows', () => {
    for (const table of [
      'rsvp_reminder_campaigns',
      'reminder_deliveries',
      'guest_communication_preferences',
      'ai_seating_suggestions',
      'ai_conversations',
      'ai_messages',
      'ai_knowledge_base',
    ]) {
      expect(migration).toContain(`ALTER TABLE public.${table}`);
    }
    expect(migration.match(/ON DELETE CASCADE/g)).toHaveLength(10);
    expect(migration).not.toMatch(/DELETE FROM public\.(guests|tables|event_media_items|ai_|rsvp_|reminder_)/);
  });
});
