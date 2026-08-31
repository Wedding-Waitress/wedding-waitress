import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20260830271500_secure_guestbook_submission_deletion.sql', 'utf8');
const edge = readFileSync('supabase/functions/delete-guestbook-submission/index.ts', 'utf8');
const guestbook = readFileSync('src/components/Dashboard/PhotoVideoGallery/GuestGuestbookTab.tsx', 'utf8');

describe('guestbook submission deletion security', () => {
  it('requires a unique secret for text edits and deletes', () => {
    expect(sql).toContain('delete_token_hash = public._hash_upload_token(_delete_token)');
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.delete_event_guestbook_text(text, uuid)');
  });

  it('removes the insecure shared-gallery-token media delete RPC', () => {
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.delete_event_guestbook_media(text, uuid)');
    expect(sql).toContain('i.upload_token_hash = public._hash_upload_token(_delete_token)');
  });

  it('cleans storage only after the database validates the submission secret', () => {
    expect(edge.indexOf("rpc('consume_guestbook_media_delete'")).toBeLessThan(edge.indexOf("storage.from('event-media').remove"));
    expect(guestbook).toContain("functions.invoke('delete-guestbook-submission'");
    expect(guestbook).toContain('setSavedAudioDeleteToken(uploadResult.deleteToken)');
  });
});
