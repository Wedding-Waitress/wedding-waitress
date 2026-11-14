import { describe, expect, it } from 'vitest';
import { PLAN_DETAILS } from './upgradePlans';

describe('upgrade additional-event display', () => {
  it.each(['essential', 'premium'] as const)('shows the GST-inclusive additional-event total for %s', plan => {
    expect(PLAN_DETAILS[plan].features).toContain('Add extra events for A$99 each including GST');
    expect(PLAN_DETAILS[plan].features).not.toContain('Add extra events for A$99 each');
  });
});
