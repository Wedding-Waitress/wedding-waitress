import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  'supabase/migrations/20260830264500_staging_guest_activity_and_referrals.sql',
  'utf8',
);

describe('staging guest activity and referrals', () => {
  it('keeps activity rows scoped to accessible events and matching guests', () => {
    expect(sql).toContain('public.can_access_event((SELECT auth.uid()), event_id)');
    expect(sql).toContain('g.id = guest_activities.guest_id AND g.event_id = guest_activities.event_id');
  });

  it('does not expose the internal logging helper to browser roles', () => {
    expect(sql).toContain('FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('TO service_role');
  });

  it('limits referral state to the signed-in user and an accessible event', () => {
    expect(sql).toContain('user_id = (SELECT auth.uid())');
    expect(sql).toContain('Users manage accessible event referral dismissals');
  });
});
