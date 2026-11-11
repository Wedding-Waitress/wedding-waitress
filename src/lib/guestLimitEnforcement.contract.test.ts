import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260918055921_enforce_guest_plan_capacity.sql'),
  'utf8',
);

describe('database guest-limit enforcement contract', () => {
  it('resolves the current plan limit from subscription_plans and includes completed capacity blocks', () => {
    expect(migration).toContain('JOIN public.subscription_plans sp ON sp.id = us.plan_id');
    expect(migration).toContain('current_plan.guest_limit + purchased.guest_capacity');
    expect(migration).toContain("p.purchase_type IN ('rsvp_overage', 'guest_capacity_topup')");
  });

  it('guards events, aggregate table capacity, and guest mutations', () => {
    expect(migration).toContain('CREATE TRIGGER enforce_event_guest_entitlement');
    expect(migration).toContain('CREATE TRIGGER enforce_table_guest_capacity');
    expect(migration).toContain('CREATE TRIGGER guests_enforce_paid_plan_capacity');
  });

  it('serializes competing writes and preserves the Platform Owner bypass', () => {
    expect(migration.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(3);
    expect(migration.match(/private\.is_platform_owner/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('returns the exact guest and table minimum for fast client-side validation', () => {
    expect(migration).toContain("'existing_guest_count', existing_guest_count");
    expect(migration).toContain("'table_seat_capacity', table_seat_capacity");
    expect(migration).toContain("'minimum_guest_limit', greatest(existing_guest_count, table_seat_capacity)");
  });
});
