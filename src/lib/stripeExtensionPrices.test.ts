import { describe, expect, it } from 'vitest';
import {
  calculateExtensionPriceAud,
  DEFAULT_EXTENSION_OPTIONS,
  isValidExtensionMonths,
  normalizePublicPlanName,
} from './stripeExtensionPrices';

describe('access extension prices', () => {
  it('charges A$20 for each prepaid whole month', () => {
    expect(calculateExtensionPriceAud(1)).toBe(20);
    expect(calculateExtensionPriceAud(7)).toBe(140);
    expect(calculateExtensionPriceAud(12)).toBe(240);
  });
  it('supports shortcuts plus any whole month within Stripe amount bounds', () => {
    expect(DEFAULT_EXTENSION_OPTIONS.map((item) => item.months)).toEqual([1,2,3,4,5,6,12]);
    expect(isValidExtensionMonths(7)).toBe(true);
    expect(isValidExtensionMonths(0)).toBe(false);
    expect(isValidExtensionMonths(1.5)).toBe(false);
    expect(isValidExtensionMonths(50_000)).toBe(false);
  });
  it('keeps the internal Unlimited identifier but presents Ultimate publicly', () => {
    expect(normalizePublicPlanName('Unlimited')).toBe('Ultimate');
  });
});

it('normalises legacy account labels without renaming internal identifiers',()=>{expect(normalizePublicPlanName('Unlimited Plan')).toBe('Ultimate Plan');expect(normalizePublicPlanName('unlimited')).toBe('Ultimate');expect(normalizePublicPlanName('Essential')).toBe('Essential');expect(normalizePublicPlanName('Ultimate')).toBe('Ultimate');});
