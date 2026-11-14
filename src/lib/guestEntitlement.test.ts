import { describe, expect, it } from 'vitest';
import { effectiveEventGuestLimit, guestPlanDisplayName, isTrialGuestPlan } from './guestEntitlement';

describe('guest entitlement presentation and effective limits', () => {
  it('uses the lower of the event limit and purchased plan entitlement', () => {
    expect(effectiveEventGuestLimit({ eventGuestLimit: 80, entitledGuestLimit: 100, isPlatformOwner: false })).toBe(80);
    expect(effectiveEventGuestLimit({ eventGuestLimit: 120, entitledGuestLimit: 110, isPlatformOwner: false })).toBe(110);
  });

  it('keeps the Platform Owner bypass unrestricted', () => {
    expect(effectiveEventGuestLimit({ eventGuestLimit: 20, entitledGuestLimit: 20, isPlatformOwner: true })).toBeNull();
  });

  it('labels the trial and Ultimate plan for the dynamic limit dialog', () => {
    expect(isTrialGuestPlan('Starter Plan')).toBe(true);
    expect(guestPlanDisplayName('Starter Plan')).toBe('Free 7-day trial');
    expect(guestPlanDisplayName('Unlimited Plan')).toBe('Ultimate');
  });
});
