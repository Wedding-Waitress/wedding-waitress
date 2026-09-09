import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260909190000_complete_team_access_authorization.sql',
  'utf8',
);

describe('complete Team & Access authorization migration', () => {
  it('binds event access to the authenticated caller and active membership', () => {
    expect(migration).toContain('_user_id = (SELECT auth.uid())');
    expect(migration).toContain('am.accepted_at IS NOT NULL');
    expect(migration).toContain('am.access_disabled_at IS NULL');
    expect(migration).toContain('public.is_account_operational(am.account_owner_id)');
  });

  it('keeps paid account lifecycle actions master-only', () => {
    expect(migration).toContain('CREATE POLICY "Master creates events"');
    expect(migration).toContain('CREATE POLICY "Master deletes events"');
    expect(migration).toContain('public.is_account_master((SELECT auth.uid()))');
  });

  it('covers direct, nested and storage-backed event planning data', () => {
    for (const table of [
      'floor_plan_share_tokens',
      'guest_activities',
      'seating_chart_share_tokens',
      'running_sheet_items',
      'dj_mc_items',
      'family_group_members',
      'event_shortlinks',
      'guest_access_tokens',
      'guest_update_logs',
      'qr_scan_logs',
    ]) expect(migration).toContain(table);
    for (const bucket of [
      'invitations',
      'qr-assets',
      'live-view-uploads',
      'reception-floor-plan-backgrounds',
      'event-media-branding',
    ]) expect(migration).toContain(bucket);
  });

  it('activates the Edge workflow only after the authorization boundary exists', () => {
    expect(migration.trimEnd()).toMatch(
      /CREATE OR REPLACE FUNCTION public\.internal_team_access_ready\(\)[\s\S]*SELECT true[\s\S]*TO service_role;$/,
    );
  });
});
