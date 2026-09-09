import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Team & Access rollback safety', () => {
  it('disables readiness and privileged invitation mutations without deleting records', () => {
    const sql = readFileSync('supabase/rollbacks/20260830114357_secure_team_access_workflow.rollback.sql', 'utf8');
    expect(sql).toContain('SELECT false');
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.internal_create_account_invitation');
    expect(sql).not.toMatch(/DELETE FROM|DROP TABLE|DROP COLUMN/i);
  });

  it('contracts event access to the owner while preserving account and event data', () => {
    const sql = readFileSync('supabase/rollbacks/20260909190000_complete_team_access_authorization.rollback.sql', 'utf8');
    expect(sql).toContain('SELECT false');
    expect(sql).toContain('e.user_id = _user_id');
    expect(sql).not.toMatch(/DELETE FROM|DROP TABLE|DROP COLUMN/i);
  });
});
