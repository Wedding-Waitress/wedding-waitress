import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260917085653_platform_owner_event_creation_entitlement.sql',
  'utf8',
);
const manualCreation = readFileSync('src/hooks/useEvents.ts', 'utf8');
const guidedCreation = readFileSync('src/lib/guidedEventSetup.ts', 'utf8');
const guidedPage = readFileSync('src/components/Onboarding/GuidedEventSetup.tsx', 'utf8');

describe('platform owner event creation authorization', () => {
  it('keeps manual and Guided Setup creation on the same authoritative allowance and insert path', () => {
    expect(manualCreation).toContain('const allowance = await getEventAllowanceSnapshot()');
    expect(manualCreation).toMatch(/supabase\s*\.from\('events'\)\s*\.insert/);
    expect(guidedCreation).toContain('const allowance = await getEventAllowanceSnapshot()');
    expect(guidedCreation).toContain("supabase.from('events').insert");
    expect(guidedPage).toContain('const eventId = await completeGuidedSetup');
  });

  it('uses only the existing private UUID entitlement for the owner bypass', () => {
    expect(migration).toContain('private.is_platform_owner(p_owner_id)');
    expect(migration).toContain('public.has_platform_owner_access() as is_platform_owner');
    expect(migration).toContain('private.is_platform_owner(new.user_id)');
    expect(migration).not.toMatch(/email|user_metadata|app_metadata|localStorage/i);
    expect(migration).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('reports an inactive or expired platform owner as eligible and never at the event cap', () => {
    expect(migration).toMatch(/when private\.is_platform_owner\(p_owner_id\) then true[\s\S]*when not n\.has_subscription then true[\s\S]*n\.status = 'active'/i);
    expect(migration).toMatch(/when u\.is_platform_owner then false[\s\S]*u\.active_events >=/i);
    expect(migration).toMatch(/when u\.is_platform_owner then true[\s\S]*when not u\.has_subscription then true[\s\S]*u\.status = 'active'/i);
  });

  it('bypasses the transaction-safe slot limit only for the private platform owner', () => {
    const bypass = migration.indexOf('if private.is_platform_owner(new.user_id) then');
    const allowance = migration.indexOf('from private.resolve_event_allowance(new.user_id)');
    expect(bypass).toBeGreaterThan(-1);
    expect(bypass).toBeLessThan(allowance);
    expect(migration).toContain("message = 'WW_EVENT_PLAN_INACTIVE'");
    expect(migration).toContain("message = 'WW_EVENT_LIMIT_REACHED'");
  });

  it('keeps ordinary inactive accounts blocked and active trial or paid accounts on the existing rules', () => {
    expect(migration).toMatch(/when not n\.has_subscription then true[\s\S]*n\.status = 'active'[\s\S]*not n\.is_read_only[\s\S]*n\.expires_at >= clock_timestamp\(\)/i);
    expect(migration).toMatch(/when not u\.has_subscription then true[\s\S]*u\.status = 'active'[\s\S]*not u\.is_read_only[\s\S]*u\.expires_at >= clock_timestamp\(\)/i);
    expect(migration).toContain('if allowance.can_create is not true then');
  });

  it('keeps the public allowance summary invoker-scoped and private functions ungrantable to clients', () => {
    expect(migration).toMatch(/function public\.get_my_event_allowance\(\)[\s\S]*security invoker/i);
    expect(migration).toContain('revoke all on function private.resolve_event_allowance(uuid) from public, anon, authenticated;');
    expect(migration).toContain('revoke all on function private.reserve_event_allowance_slot() from public, anon, authenticated;');
    expect(migration).toContain('grant execute on function public.get_my_event_allowance() to authenticated;');
  });
});
