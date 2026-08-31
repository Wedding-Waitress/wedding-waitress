import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260830230100_staging_invitations_media_final_schema.sql',
  'utf8',
);

describe('staging invitations and media catch-up security contract', () => {
  it('enables RLS and separates grants from event authorization', () => {
    expect(migration).toContain('ALTER TABLE public.invitation_designs ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE public.event_media_items ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('public.can_access_event((SELECT auth.uid()), event_id)');
    expect(migration).toContain('REVOKE ALL ON public.event_media_galleries');
    expect(migration).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE)[^;]+ TO anon/);
  });

  it('keeps event media private and restricts anonymous uploads to registered pending paths', () => {
    expect(migration).toMatch(/VALUES \('event-media', 'event-media', false,/);
    expect(migration).toContain('public.is_pending_event_media_path(name)');
    expect(migration).toContain("upload_token_expires_at > now()");
    expect(migration).toContain("upload_status = 'pending'");
    expect(migration).toContain('upload_token_hash=public._hash_upload_token(_upload_token)');
  });

  it('derives object extensions only from validated MIME types', () => {
    expect(migration).toContain('validated MIME type is the sole source');
    expect(migration).not.toContain("regexp_replace(COALESCE(_filename,''), '^.*\\.', '')");
    expect(migration).toContain("WHEN 'video/quicktime' THEN 'mov'");
    expect(migration).toContain("WHEN 'audio/x-wav' THEN 'wav'");
  });

  it('explicitly allow-lists public RPCs and keeps host mutations authenticated', () => {
    expect(migration).toContain('Public functions are explicitly allow-listed');
    expect(migration).toContain('TO anon,authenticated,service_role');
    expect(migration).toContain('TO authenticated;');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.verify_event_media_password(text,text) TO service_role');
  });
});
