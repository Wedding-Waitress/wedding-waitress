import { describe, expect, it } from 'vitest';
import { adminPlanLabel, adminPlanOptions } from './adminPlanDisplay';
describe('current admin plan presentation', () => {
  it.each(['Unlimited', 'unlimited', 'Ultimate', 'Unlimited Plan', 'ultimate-plan'])('maps %s to Ultimate without changing a stored ID', name => {
    expect(adminPlanLabel(name)).toBe('Ultimate');
  });
  it('retains historical and trial records rather than turning them into paid plans', () => {
    expect(adminPlanLabel('Vendor Pro')).toBe('Vendor Pro (discontinued historical plan)');
    expect(adminPlanLabel('Starter Trial')).toBe('Starter Trial');
    expect(adminPlanLabel('Unknown plan')).toBe('Unknown plan');
    expect(adminPlanLabel(null)).toBeNull();
  });
  it('always lists the three current packages once, with recorded historical plans separate', () => {
    expect(adminPlanOptions(['Unlimited', 'Ultimate', 'Premium', 'Vendor Pro', null])).toEqual([
      'Essential', 'Premium', 'Ultimate', 'Vendor Pro (discontinued historical plan)',
    ]);
  });
});
