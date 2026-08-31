import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');
const migration = read('supabase/migrations/20260819193000_admin_platform_reporting_sync.sql');
const ui = read('src/components/Admin/AdminCentrePages.tsx');
const admin = read('src/pages/Admin.tsx');
const audit = read('docs/admin-platform-data-audit.md');

describe('authoritative Admin platform reporting', () => {
  it('maps the event, table, guest and RSVP sources by event ownership', () => {
    for (const source of ['public.events', 'public.tables', 'public.guests', 'public.rsvp_invite_logs']) {
      expect(migration).toContain(source);
    }
    expect(migration).toContain('g.table_id IS NOT NULL');
    expect(migration).toContain("g.rsvp='attending'");
    expect(migration).toContain('LEFT JOIN guest_stats gs ON gs.event_id=e.id');
    expect(migration).toContain('LEFT JOIN table_stats ts ON ts.event_id=e.id');
    expect(migration).toContain('SELECT er.user_id');
  });

  it('aggregates every persisted authenticated feature without returning private content', () => {
    for (const source of [
      'invitation_card_settings', 'signage_settings', 'place_card_settings',
      'full_seating_chart_settings', 'dietary_chart_settings', 'reception_floor_plans',
      'dj_mc_questionnaires', 'running_sheets', 'qr_code_settings',
      'live_view_module_settings', 'event_media_galleries', 'event_media_items',
      'event_guestbook_messages', 'account_members', 'user_subscriptions',
      'event_purchases', 'rsvp_invite_purchases', 'account_lifecycle',
    ]) expect(migration, source).toContain(`public.${source}`);
    for (const privateProjection of ['m.message', 'g.first_name', 'g.email', 'g.mobile', 'g.notes', 'g.dietary AS']) {
      expect(migration).not.toContain(privateProjection);
    }
  });

  it('keeps reporting server-authorized and inaccessible to anonymous or ordinary users', () => {
    expect(migration).toContain('IF NOT public.is_owner_admin()');
    expect(migration).toContain("ERRCODE='42501'");
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain('SET search_path=public,auth,pg_temp');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.get_admin_platform_snapshot() FROM PUBLIC,anon');
  });

  it('uses one deduplicated protected snapshot instead of per-customer or per-event requests', () => {
    expect(ui).toContain('get_admin_platform_snapshot');
    expect(ui).toContain('if (snapshotRequest) return snapshotRequest');
    expect(migration).toContain('WITH\n  guest_stats AS');
    expect(migration).toContain('event_reporting AS');
    expect(migration).not.toContain('FOR er IN');
  });

  it('supports refresh and clears protected caches at every Admin trust-boundary loss', () => {
    expect(ui).toContain('SnapshotFreshness');
    expect(ui).toContain('Refreshing…');
    expect(admin).toContain('clearAllCaches(); navigate');
    expect(admin).toContain('clearAllCaches(); await supabase.auth.signOut()');
  });

  it('documents every requested Wedding Waitress feature and honest reporting gap', () => {
    for (const feature of [
      'Dashboard', 'My Events', 'Tables', 'Guest List', 'QR Code Seating Chart',
      'Seating Chart Signs', 'Invitations & Cards', 'Name Place Cards',
      'Individual Table Charts', 'Floor Plan', 'Dietary Requirements',
      'Full Seating Chart', 'Kiosk Live View', 'DJ & MC Questionnaire',
      'Run Sheet', 'Photo & Video Sharing', 'Digital Guestbook',
      'Digital Photo Booth', 'Live Slideshow', 'Account Centre',
    ]) expect(audit, feature).toContain(feature);
    expect(audit).toContain('cannot be reported');
  });
});

