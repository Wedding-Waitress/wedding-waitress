import { describe, expect, it } from 'vitest';
import { requireStripeSandbox, STRIPE_TEST_CATALOGUE } from './stripeTestCatalogue';

describe('sandbox provisioning catalogue', () => {
  it('matches current packages and upgrade differences', () => {
    expect(STRIPE_TEST_CATALOGUE.slice(0, 6).map(item => item.cents)).toEqual([19900, 24900, 29900, 5000, 5000, 10000]);
    expect(STRIPE_TEST_CATALOGUE[2].name).toBe('Ultimate');
    expect(STRIPE_TEST_CATALOGUE.find(item=>item.key==='additional_event')).toMatchObject({cents:9000,lookupKey:'ww_test_v2_additional_event_99_total'});
  });
  it('contains only unique one-time AUD items without live provider identifiers', () => {
    expect(new Set(STRIPE_TEST_CATALOGUE.map(item => item.lookupKey)).size).toBe(11);
    for (const item of STRIPE_TEST_CATALOGUE) {
      expect(item.currency).toBe('aud'); expect(item.recurring).toBe(false);
      expect(item.taxBehavior).toBe('exclusive');
      expect(item.cents).toBeGreaterThan(0); expect(Number.isSafeInteger(item.cents)).toBe(true);
      expect(JSON.stringify(item)).not.toMatch(/prod_|price_/);
    }
  });
  it('rejects live and uncertain mode before provisioning', () => {
    expect(() => requireStripeSandbox({ livemode: true })).toThrow();
    expect(() => requireStripeSandbox({} as { livemode: boolean })).toThrow();
    expect(() => requireStripeSandbox({ livemode: false })).not.toThrow();
  });
});

