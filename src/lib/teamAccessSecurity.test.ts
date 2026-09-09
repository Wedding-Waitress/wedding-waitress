import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20260830114357_secure_team_access_workflow.sql', 'utf8');
const edgeFunction = readFileSync('supabase/functions/manage-account-members/index.ts', 'utf8');

describe('Team & Access security contract', () => {
  it('removes browser mutations and invitation-secret access', () => {
    expect(migration).toContain('REVOKE ALL ON public.account_invitations FROM anon, authenticated');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.account_members FROM anon, authenticated');
    expect(migration).toContain('idx_account_invitations_pending_email');
    expect(migration).toContain('token = NULL, token_hash = NULL');
  });

  it('atomically reserves no more than five total identities', () => {
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('IF occupied_seats >= 5 THEN');
    expect(migration).toContain("status = 'pending'");
    expect(migration).toContain("accepted_at IS NOT NULL");
  });

  it('protects master ownership and email-binds acceptance', () => {
    expect(migration).toContain('WHERE lower(email) = normalized_email');
    expect(migration).toContain("role = 'master'");
    expect(migration).toContain('A master account holder cannot join another account');
    expect(migration).toContain("role = 'standard'");
    expect(migration).toContain('member_user_id <> p_owner_id');
  });

  it('exposes privileged RPCs only to the service role and verifies callers', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.internal_create_account_invitation[\s\S]*FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.internal_create_account_invitation[\s\S]*TO service_role/);
    expect(edgeFunction).toContain('callerClient.auth.getUser()');
    expect(edgeFunction).toContain(".eq('role', 'master')");
    expect(edgeFunction).not.toContain('user_metadata');
  });

  it('fails closed until account-wide access is deliberately enabled', () => {
    expect(edgeFunction).toContain("Deno.env.get('TEAM_ACCESS_ENABLED') !== 'true'");
    expect(edgeFunction).toContain("return json({ error: 'Team access is not available in this environment' }, 503)");
    expect(migration).toMatch(/internal_team_access_ready\(\)[\s\S]*AS \$\$ SELECT false \$\$/);
    expect(edgeFunction).toContain("admin.rpc('internal_team_access_ready')");
  });

  it('keeps invitation secrets out of query strings', () => {
    expect(edgeFunction).toContain('The authenticated email address is the claim credential');
    expect(edgeFunction).not.toContain('accept-team-invitation?token=');
    expect(edgeFunction).not.toContain('invitation.token');
  });

  it('requires explicit preview then acceptance and stores the complete invitee identity', () => {
    expect(migration).toContain('internal_preview_account_invitation');
    expect(migration).toContain('first_name');
    expect(migration).toContain('last_name');
    expect(migration).toContain('mobile');
    expect(edgeFunction).toContain("body.action === 'preview'");
    expect(edgeFunction).toContain("body.action === 'accept'");
    expect(edgeFunction).toContain('caller.email_confirmed_at');
  });

  it('releases the reserved seat when transactional delivery is suppressed', () => {
    expect(edgeFunction).toContain("emailResult?.success !== true");
    expect(edgeFunction).toContain("admin.rpc('internal_revoke_account_invitation'");
  });
});
