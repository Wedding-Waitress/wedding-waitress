import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261026100500_guard_guest_lookup_postal_privacy.sql', 'utf8');

describe('public guest lookup postal privacy', () => {
  it('requires an unexpired recipient token before returning invitation-only data', () => {
    expect(sql).toContain('gat.access_token = get_public_event_with_data_secure.access_token');
    expect(sql).toContain('gat.expires_at > now()');
    expect(sql).toContain('r.event_id = e.id');
    expect(sql).toContain('g.id = r.guest_id');
    expect(sql).toContain('g.family_group = r.family_group');
    expect(sql).not.toContain('gat.access_token = access_token');
  });

  it('masks all postal address fields on the public QR lookup', () => {
    for (const field of ['mailing_address', 'mailing_suburb', 'mailing_state', 'mailing_postcode']) {
      expect(sql).toContain(`CASE WHEN get_public_event_with_data_secure.access_token IS NOT NULL THEN g.${field} ELSE NULL END`);
    }
    expect(sql).toContain('THEN COALESCE(g.address_received, false) ELSE false END');
  });

  it('retains public seating lookup and existing event visibility controls', () => {
    expect(sql).toContain('get_public_event_with_data_secure.access_token IS NULL');
    expect(sql).toContain('e.qr_apply_to_live_view = true');
    expect(sql).toContain('COALESCE(e.public_show_venue, true)');
    expect(sql).toContain('g.table_no, g.table_id, g.seat_no');
    expect(sql).not.toMatch(/DROP\s+FUNCTION|DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });
});
