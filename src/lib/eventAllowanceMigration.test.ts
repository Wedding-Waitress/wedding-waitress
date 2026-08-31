import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260831153142_enforce_event_allowances.sql'),
  'utf8',
);

describe('event allowance migration safety contract', () => {
  it('backs up and updates only plan allowance values', () => {
    expect(sql).toContain('subscription_plan_event_limit_backup_20260831');
    expect(sql).toMatch(/when lower\(name\) in \('vendor', 'vendor pro'\) then 100/);
    expect(sql).toMatch(/else 1/);
    expect(sql).not.toMatch(/delete from public\.events/i);
    expect(sql).not.toMatch(/update public\.events/i);
  });

  it('counts exact paid status only for couple paid plans', () => {
    expect(sql).toContain("aep.status = 'paid'");
    expect(sql).toContain("n.plan_key in ('essential', 'premium', 'unlimited')");
  });

  it('uses unique slots and conflict-safe retries for concurrent creation', () => {
    expect(sql).toContain('primary key (owner_id, slot_number)');
    expect(sql).toContain('on conflict do nothing');
    expect(sql).toContain("message = 'WW_EVENT_LIMIT_REACHED'");
  });

  it('keeps privileged functions private and exposes only a security-invoker summary', () => {
    expect(sql).toContain('revoke all on schema private from public, anon, authenticated');
    expect(sql).toMatch(/function public\.get_my_event_allowance\(\)[\s\S]*security invoker/i);
    expect(sql).toContain('grant execute on function public.get_my_event_allowance() to authenticated');
    expect(sql).not.toMatch(/grant execute on function private\./i);
  });
});
