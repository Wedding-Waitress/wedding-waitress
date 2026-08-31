import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  error: null as { message: string } | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: mocks.row ? [mocks.row] : [], error: mocks.error })),
  },
}));

import {
  EventAllowanceError,
  getDatabaseEventCreationError,
  getEventAllowanceSnapshot,
  getEventCreationBlockMessage,
} from './eventAllowance';

const row = (
  plan: string,
  included: number,
  paid: number,
  active: number,
  canBuy: boolean,
  canCreate = true,
) => ({
  plan_key: plan,
  included_events: included,
  paid_additional_events: paid,
  total_allowed: included + paid,
  active_events: active,
  remaining: Math.max(0, included + paid - active),
  at_cap: active >= included + paid,
  can_purchase_additional_events: canBuy,
  can_create: canCreate,
});

describe('event allowance client contract', () => {
  beforeEach(() => { mocks.error = null; });

  it.each([
    ['free', 1, 0, 1, false],
    ['essential', 1, 0, 1, true],
    ['premium', 1, 0, 1, true],
    ['unlimited', 1, 0, 1, true],
    ['vendor_pro', 100, 0, 100, false],
  ])('maps the authoritative %s cap', async (plan, included, paid, active, canBuy) => {
    mocks.row = row(plan, included, paid, active, canBuy);
    const allowance = await getEventAllowanceSnapshot();
    expect(allowance.totalAllowed).toBe(included + paid);
    expect(allowance.atCap).toBe(true);
    expect(allowance.canPurchaseAdditionalEvents).toBe(canBuy);
  });

  it('counts only the paid add-ons returned by the database model', async () => {
    mocks.row = row('premium', 1, 2, 2, true);
    const allowance = await getEventAllowanceSnapshot();
    expect(allowance.paidAdditionalEvents).toBe(2);
    expect(allowance.totalAllowed).toBe(3);
    expect(allowance.remaining).toBe(1);
  });

  it('never offers Vendor Pro an additional-event purchase', async () => {
    mocks.row = row('vendor_pro', 100, 0, 100, false);
    const allowance = await getEventAllowanceSnapshot();
    expect(getEventCreationBlockMessage(allowance)).toContain('100 active events');
    expect(allowance.canPurchaseAdditionalEvents).toBe(false);
  });

  it('fails closed when the allowance RPC is unavailable', async () => {
    mocks.row = null;
    mocks.error = { message: 'network' };
    await expect(getEventAllowanceSnapshot()).rejects.toMatchObject({ reason: 'unavailable' });
  });

  it('maps stable database limit and lifecycle errors', () => {
    expect(getDatabaseEventCreationError({ message: 'WW_EVENT_LIMIT_REACHED' })).toMatchObject({ reason: 'limit-reached' });
    expect(getDatabaseEventCreationError({ message: 'WW_EVENT_PLAN_INACTIVE' })).toMatchObject({ reason: 'plan-inactive' });
    expect(getDatabaseEventCreationError({ message: 'other' })).toBeNull();
    expect(new EventAllowanceError('limit-reached', 'blocked')).toBeInstanceOf(Error);
  });
});
