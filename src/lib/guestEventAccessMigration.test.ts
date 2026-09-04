import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260902161956_enforce_guest_owner_and_event_access.sql',
);
const rollbackPath = path.resolve(
  process.cwd(),
  'supabase/rollback/20260902161956_enforce_guest_owner_and_event_access.rollback.sql',
);
const obsoletePath = path.resolve(
  process.cwd(),
  'supabase/migrations/20260902160816_enforce_guest_event_owner.sql',
);
const migration = fs.readFileSync(migrationPath, 'utf8').toLowerCase();
const rollback = fs.readFileSync(rollbackPath, 'utf8').toLowerCase();

describe('guest event-owner and collaborator access migration', () => {
  it('replaces the unapplied obsolete migration without recording it', () => {
    expect(fs.existsSync(obsoletePath)).toBe(false);
    expect(migration).toContain('guests_event_owner_fkey');
    expect(migration).toContain('foreign key (event_id, user_id)');
    expect(migration).toContain('references public.events (id, user_id)');
    expect(migration).not.toMatch(/\b(?:truncate|delete from|drop table)\b/);
    expect(migration).not.toContain('uniq_guest_name_per_event');
  });

  it('uses accepted, active event access and preserves operational checks', () => {
    expect(migration).toContain('am.accepted_at is not null');
    expect(migration).toContain('am.access_disabled_at is null');
    expect(migration).toContain('public.is_account_operational(_user_id)');
    expect(migration).toContain('public.is_account_operational(e.user_id)');
    expect(migration).toContain('public.is_account_operational(am.account_owner_id)');
  });

  it('does not expose the privileged event-access function anonymously', () => {
    expect(migration).toContain(
      'revoke all on function public.can_access_event(uuid, uuid) from public, anon;',
    );
    expect(migration).toContain(
      'grant execute on function public.can_access_event(uuid, uuid) to authenticated, service_role;',
    );
    expect(migration).not.toMatch(/grant execute[^;]+to[^;]*anon/);
  });

  it('defines narrowly scoped CRUD policies with update checks', () => {
    expect(migration.match(/on public\.guests for (?:select|insert|update|delete)\s+to authenticated/g))
      .toHaveLength(4);
    expect(migration.match(/public\.can_access_event\(\(select auth\.uid\(\)\), event_id\)/g))
      .toHaveLength(5);
    expect(migration).toMatch(/for insert\s+to authenticated\s+with check/);
    expect(migration).toMatch(/for update\s+to authenticated\s+using[\s\S]+with check/);
    expect(migration).toMatch(/for delete\s+to authenticated\s+using/);
    expect(migration).not.toContain('drop policy "operational accounts create and manage guests"');
  });

  it('prevents ownership reassignment and supplies an exact rollback', () => {
    expect(migration).toContain('before update of event_id, user_id on public.guests');
    expect(migration).toContain('new.event_id is distinct from old.event_id');
    expect(migration).toContain('new.user_id is distinct from old.user_id');
    expect(rollback).toContain('drop constraint guests_event_owner_fkey');
    expect(rollback).toContain('add constraint guests_event_id_fkey');
    expect(rollback).toContain('grant execute on function public.can_access_event(uuid, uuid)');
    expect(rollback).toContain('to public, anon, authenticated, service_role;');
  });

  it('does not introduce an invented collaborator status or expiry model', () => {
    expect(migration).toContain('from public.event_collaborators ec');
    expect(migration).not.toMatch(/ec\.(?:status|expires_at|revoked_at)/);
  });
});
