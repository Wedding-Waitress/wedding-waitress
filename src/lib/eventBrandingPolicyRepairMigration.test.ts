import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260917102746_secure_event_branding_upload_and_cleanup.sql',
  'utf8',
);

const policy = (name: string, nextName?: string) => {
  const start = migration.indexOf(`alter policy "${name}"`);
  const end = nextName ? migration.indexOf(`alter policy "${nextName}"`, start) : migration.indexOf('\ncommit;', start);
  return migration.slice(start, end);
};

const readPolicy = policy('Customers read accessible event branding', 'Customers upload accessible event branding');
const insertPolicy = policy('Customers upload accessible event branding', 'Customers update accessible event branding');
const updatePolicy = policy('Customers update accessible event branding', 'Customers delete accessible event branding');
const deletePolicy = policy('Customers delete accessible event branding');

describe('event-branding policy repair migration', () => {
  it('uses the outer storage object path for every event authorization check', () => {
    for (const sql of [readPolicy, insertPolicy, updatePolicy, deletePolicy]) {
      expect(sql).toContain("split_part(storage.objects.name, '/', 3)");
      expect(sql).toContain("e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))");
      expect(sql).not.toMatch(/foldername\(name\)|foldername\(e\.name\)|split_part\(e\.name/);
    }
  });

  it('allows an owner or authorised Platform Owner while blocking unauthorised and cross-owner paths', () => {
    expect(insertPolicy).toContain('public.can_access_event((select auth.uid()), e.id)');
    expect(insertPolicy).toContain("e.id = public.safe_uuid(split_part(storage.objects.name, '/', 3))");
    expect(insertPolicy).toContain("e.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))");
    expect(insertPolicy).toContain("split_part(storage.objects.name, '/', 2) = 'events'");
    expect(insertPolicy).toContain("split_part(storage.objects.name, '/', 5) = ''");
  });

  it('keeps Guided Setup drafts owner-only, incomplete for writes, and within the approved path', () => {
    expect(insertPolicy).toContain("split_part(storage.objects.name, '/', 2) = 'drafts'");
    expect(insertPolicy).toContain('d.user_id = (select auth.uid())');
    expect(insertPolicy).toContain("d.user_id = public.safe_uuid(split_part(storage.objects.name, '/', 1))");
    expect(insertPolicy).toContain('d.completed_at is null');
  });

  it('authorizes replacement and manual removal without weakening referenced-object protection', () => {
    expect(updatePolicy).toContain('using (');
    expect(updatePolicy).toContain('with check (');
    expect(updatePolicy.match(/public\.can_access_event\(\(select auth\.uid\(\)\), e\.id\)/g)).toHaveLength(2);
    expect(deletePolicy).toContain('public.can_access_event((select auth.uid()), e.id)');
    expect(deletePolicy).toContain('not event_branding_private.object_is_referenced(storage.objects.name)');
  });

  it('allows only the exact owner folder to clean an orphan after database-first event deletion', () => {
    expect(deletePolicy).toContain("public.safe_uuid(split_part(storage.objects.name, '/', 1)) = (select auth.uid())");
    expect(deletePolicy).toMatch(/not exists \([\s\S]*?from public\.events e[\s\S]*?e\.id = public\.safe_uuid\(split_part\(storage\.objects\.name, '\/', 3\)\)/);
    expect(deletePolicy).toContain("split_part(storage.objects.name, '/', 2) = 'events'");
    expect(deletePolicy).toContain("split_part(storage.objects.name, '/', 4) <> ''");
    expect(deletePolicy).toContain("split_part(storage.objects.name, '/', 5) = ''");
  });

  it('does not change bucket visibility, file limits, MIME types, or global access restrictions', () => {
    expect(migration).not.toMatch(/storage\.buckets|public\s*=|file_size_limit|allowed_mime_types/i);
    expect(migration).not.toMatch(/to\s+(anon|public)|service_role/i);
    expect(migration).not.toMatch(/drop\s+(table|column)|truncate|delete\s+from/i);
    expect(migration).not.toMatch(/Current entitlement required for planning|Prelaunch verified owner access|Suspension blocks storage access/);
  });
});
