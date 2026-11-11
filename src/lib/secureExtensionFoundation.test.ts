import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = fs.readFileSync('supabase/migrations/20260914075806_secure_extension_receipt_foundation.sql', 'utf8');

describe('security-preserving extension release prerequisite', () => {
  it('does not replace installed access controls or download windows', () => {
    for (const name of ['is_account_operational', 'subscription_allows_event_edit', 'refresh_my_subscription_lifecycle', 'guard_suspended_data_request']) {
      expect(sql).not.toMatch(new RegExp(`create(?: or replace)? function public\\.${name}\\(`, 'i'));
    }
    expect(sql).not.toMatch(/drop (?:function|trigger|policy)/i);
    expect(sql).not.toMatch(/set download_only_ends_at\s*=/i);
    expect(sql).toContain('private.set_extension_recovery_deadline()');
  });

  it('requires service-only fulfillment and an unrestricted accepted master, including replays', () => {
    expect(sql).toContain("raise exception 'Service role required'");
    for (const name of ['account_planning_blocked', 'admin_deleted_planning_blocked', 'closed_account_planning_blocked']) {
      expect(sql).toContain(`private.${name}(_user_id)`);
    }
    expect(sql).toContain("m.role='master' and m.accepted_at is not null and m.access_disabled_at is null");
    expect(sql.indexOf('private.account_planning_blocked(_user_id)')).toBeLessThan(sql.indexOf('select * into existing'));
    expect(sql).toContain("'account-return:'||_user_id::text");
    expect(sql).toContain("'access-extension-session:'");
    expect(sql).toContain('from public, anon, authenticated');
  });

  it('installs no reminder/purge operations or schedules', () => {
    expect(sql).not.toMatch(/cron\.schedule|create(?: or replace)? function public\.(?:schedule_access|claim_access|prepare_expired|complete_access|get_access_recovery_storage)/i);
    for (const table of ['access_extension_purchases', 'access_expiry_reminders', 'access_recovery_cleanup_jobs']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on public.${table} from public, anon, authenticated`);
    }
  });
});
