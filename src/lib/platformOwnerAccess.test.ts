import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260904234628_add_platform_owner_access.sql',
  'utf8',
);
const rollback = readFileSync(
  'supabase/rollback/20260904234628_add_platform_owner_access.rollback.sql',
  'utf8',
);
const planHook = readFileSync('src/hooks/useUserPlan.ts', 'utf8');
const subscriptionCard = readFileSync('src/components/Account/SubscriptionCard.tsx', 'utf8');
const sidebar = readFileSync('src/components/Dashboard/AppSidebar.tsx', 'utf8');
const expiryWarning = readFileSync('src/components/Dashboard/ExpiryWarningBanner.tsx', 'utf8');

describe('platform owner access security contract', () => {
  it('stores exactly one UUID entitlement outside the exposed public schema', () => {
    expect(migration).toContain('CREATE TABLE private.platform_owners');
    expect(migration).toContain('singleton boolean PRIMARY KEY');
    expect(migration).toContain("'a0dba7aa-b67a-4856-8e7e-4af91d43d3fa'");
    expect(migration).toContain(
      'REVOKE ALL ON TABLE private.platform_owners FROM PUBLIC, anon, authenticated;',
    );
    expect(migration).not.toMatch(/email\s*[)=]|lower\(btrim\(email\)\)/i);
  });

  it('uses the private entitlement in both owner-admin and planning authorization', () => {
    expect(migration).toMatch(
      /public\.has_role[\s\S]*_role <> 'admin'[\s\S]*private\.is_platform_owner\(_user_id\)/,
    );
    expect(migration).toMatch(
      /public\.subscription_allows_event_edit[\s\S]*private\.is_platform_owner\(owner_id\)[\s\S]*subscription\.status = 'active'[\s\S]*subscription\.is_read_only = false[\s\S]*now\(\) <= subscription\.expires_at/,
    );
  });

  it('prevents clients and non-owner role rows from granting owner access', () => {
    expect(migration).toContain('REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;');
    expect(migration).toMatch(
      /NEW\.role = 'admin'[\s\S]*NOT private\.is_platform_owner\(NEW\.user_id\)[\s\S]*ERRCODE = '42501'/,
    );
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.has_platform_owner_access() FROM PUBLIC, anon;',
    );
  });

  it('ships an explicit rollback that removes only the owner bypass', () => {
    expect(rollback).toContain('DROP TABLE IF EXISTS private.platform_owners;');
    expect(rollback).toMatch(
      /public\.subscription_allows_event_edit[\s\S]*SELECT EXISTS[\s\S]*subscription\.status = 'active'/,
    );
    expect(rollback).not.toContain('private.is_platform_owner(owner_id)\n    OR EXISTS');
  });

  it('derives the owner label from the server RPC and suppresses expiry UI', () => {
    expect(planHook).toContain("supabase.rpc('has_platform_owner_access')");
    expect(planHook).toContain('isTrialExpired = !hasPlatformOwnerAccess');
    expect(subscriptionCard).toContain("displayPlanName = 'Platform Owner Access'");
    expect(sidebar).toContain("return 'Platform Owner Access'");
    expect(expiryWarning).toContain('if (hasPlatformOwnerAccess) return null;');
    expect(planHook).not.toMatch(/user_metadata|localStorage/i);
  });
});
