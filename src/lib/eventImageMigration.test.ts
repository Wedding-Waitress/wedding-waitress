import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260902121937_add_secure_event_branding.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');
const repairSql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260902131756_fix_event_branding_outer_object_name.sql'),
  'utf8',
);
const zoomSql = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260902135447_add_event_image_zoom.sql'),
  'utf8',
);

describe('secure event branding migration', () => {
  it('creates a private five-megabyte image bucket and persistent event fields', () => {
    expect(sql).toContain("'event-branding'");
    expect(sql).toMatch(/false,\s*5242880/);
    expect(sql).toContain("array['image/jpeg', 'image/png', 'image/webp']");
    expect(sql).toContain('add column event_image_path text');
    expect(sql).toContain("event_image_fit in ('cover', 'contain')");
  });

  it('keeps draft reads and writes owner-scoped and supports draft upsert', () => {
    expect(sql).toContain('d.user_id = (select auth.uid())');
    expect(sql).toContain("d.user_id::text = (storage.foldername(storage.objects.name))[1]");
    expect(sql.match(/\(storage\.foldername\(storage\.objects\.name\)\)\[2\] = 'drafts'/g)?.length).toBeGreaterThanOrEqual(5);
    expect(sql.match(/d\.completed_at is null/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/for update to authenticated[\s\S]*?\[2\] = 'drafts'[\s\S]*?with check[\s\S]*?\[2\] = 'drafts'/i);
  });

  it('allows established event access for reads but only owners can write or delete', () => {
    const readPolicy = sql.match(/create policy "Customers read accessible event branding"[\s\S]*?\n\);/)?.[0] ?? '';
    const writePolicies = sql.slice(sql.indexOf('create policy "Customers upload accessible event branding"'));
    expect(readPolicy).toContain('public.can_access_event((select auth.uid()), e.id)');
    expect(writePolicies).not.toContain('public.can_access_event');
    expect(writePolicies.match(/e\.user_id = \(select auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(writePolicies.match(/\(storage\.foldername\(storage\.objects\.name\)\)\[1\] = \(select auth\.uid\(\)\)::text/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('blocks deletion while an owner event or active draft references the real image path property', () => {
    expect(sql).toContain("d.answers ->> 'eventImagePath' = object_name");
    expect(sql).toContain('e.event_image_path = object_name');
    expect(sql).toContain('and d.completed_at is null');
    expect(sql).toContain('and not event_branding_private.object_is_referenced(storage.objects.name)');
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain('revoke all on function event_branding_private.object_is_referenced(text) from public, anon');
  });

  it('does not grant anonymous access or introduce destructive data changes', () => {
    expect(sql).not.toMatch(/to anon|to public/i);
    expect(sql).not.toMatch(/drop table|truncate|delete\s+from\s+public\./i);
    expect(sql).not.toMatch(/service[_ ]role/i);
  });

  it('qualifies the outer storage object name inside every event subquery', () => {
    expect(sql).not.toContain('storage.foldername(name)');
    expect(sql).not.toContain('e.event_image_path = name');
    expect(repairSql).toContain('alter policy "Customers read accessible event branding"');
    expect(repairSql).toContain('storage.foldername(storage.objects.name)');
    expect(repairSql).not.toContain('storage.foldername(name)');
  });

  it('adds only the bounded event image zoom field in the pending migration', () => {
    expect(zoomSql).toContain('add column event_image_zoom smallint not null default 100');
    expect(zoomSql).toContain('check (event_image_zoom between 100 and 200)');
    expect(zoomSql).not.toMatch(/drop\s|delete\s|truncate\s|storage\.|auth\./i);
  });
});
