import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260830243000_staging_core_runtime_catchup.sql';
const migration = readFileSync(migrationPath, 'utf8');

describe('staging core runtime catch-up migration contract', () => {
  it('records the canonical live-view table without replacing existing data', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.live_view_settings');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS kiosk_show_rsvp_status');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS live_view_settings_event_id_key');
    expect(migration).toContain('ON DELETE CASCADE');
  });

  it('keeps direct live-view settings access owner/collaborator scoped', () => {
    expect(migration).toContain('ALTER TABLE public.live_view_settings FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.live_view_settings FROM PUBLIC, anon');
    expect(migration).toContain('TO authenticated');
    expect(migration).toContain('event_row.user_id = (SELECT auth.uid())');
    expect(migration).toContain('FROM public.event_collaborators collaborator');
    expect(migration).toMatch(/FOR UPDATE[\s\S]*USING \([\s\S]*WITH CHECK \(/);
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.get_public_live_view_settings');
    expect(migration).toContain('event_row.qr_apply_to_live_view = true');
  });

  it('provisions the missing run-sheet sharing dependency chain idempotently', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS section_label');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS is_bold');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.running_sheet_share_tokens');
    expect(migration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS running_sheet_share_tokens_token_key');
    expect(migration).toContain('running_sheet_share_tokens_token_format_check');
    expect(migration).toContain('ALTER TABLE public.running_sheet_share_tokens FORCE ROW LEVEL SECURITY');
    expect(migration).toContain('REVOKE ALL ON TABLE public.running_sheet_share_tokens FROM PUBLIC, anon');
    expect(migration).toContain('WITH CHECK (');
  });

  it('defines the complete public Run Sheet share RPC contract', () => {
    expect(migration).toContain('FUNCTION public.generate_running_sheet_share_token');
    expect(migration).toContain('FUNCTION public.get_running_sheet_by_token');
    expect(migration).toContain('FUNCTION public.update_running_sheet_item_by_token');
    expect(migration).toContain('FUNCTION public.add_running_sheet_item_by_token');
    expect(migration).toContain('FUNCTION public.delete_running_sheet_item_by_token');
    expect(migration).toContain('FUNCTION public.duplicate_running_sheet_item_by_token');
    expect(migration).toContain('FUNCTION public.reorder_running_sheet_items_by_token');
    expect(migration).toContain('FUNCTION public.update_running_sheet_meta_by_token');
  });

  it('authorizes share writes only with a valid unexpired edit token', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.update_running_sheet_meta_by_token');
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("normalized_token !~ '^[A-Za-z0-9_-]+$'");
    expect(migration).toContain("token_row.permission = 'can_edit'");
    expect(migration).toContain('token_row.expires_at > statement_timestamp()');
    expect(migration).toContain('WHERE sheet_row.id = target_sheet_id');
    expect(migration).toContain('FOR UPDATE OF token_row');
    expect(migration).toContain('cardinality(item_ids) <>');
    expect(migration).toContain('count(DISTINCT supplied_id)');
  });

  it('exposes only the token RPC to public share-link callers', () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.update_running_sheet_meta_by_token\(text, text, text\)[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.update_running_sheet_meta_by_token\(text, text, text\)[\s\S]*TO anon, authenticated/,
    );
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.generate_running_sheet_share_token[\s\S]*FROM PUBLIC, anon/,
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.generate_running_sheet_share_token[\s\S]*TO authenticated/,
    );
  });

  it('does not duplicate guest-access tables or floor-plan table semantics', () => {
    expect(migration).not.toContain('CREATE TABLE public.guest_access_tokens');
    expect(migration).not.toContain('CREATE TABLE IF NOT EXISTS public.guest_access_tokens');
    expect(migration).not.toContain('table_type');
    expect(migration).not.toContain('table_purpose');
  });
});
