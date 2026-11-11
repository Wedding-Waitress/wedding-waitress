import { describe, expect, it } from 'vitest';
import { STRIPE_LIVE_ACCOUNT_ID, STRIPE_LIVE_CATALOGUE } from './stripeLiveCatalogue';
import { PACKAGE_CHECKOUT_AVAILABLE } from './packagePricing';
import { PLAN_PRICES, ADDITIONAL_EVENT_AUD, GUEST_CAPACITY_TOPUP } from './stripePrices';

describe('verified live catalogue mapping', () => {
  it('binds primary package and add-on references to the verified prices', () => {
    for (const key of ['essential', 'premium', 'unlimited'] as const) {
      expect(PLAN_PRICES[key].product_id).toBe(STRIPE_LIVE_CATALOGUE[key].productId);
      expect(PLAN_PRICES[key].price_id).toBe(STRIPE_LIVE_CATALOGUE[key].priceId);
    }
    expect(ADDITIONAL_EVENT_AUD.price_id).toBe(STRIPE_LIVE_CATALOGUE.additional_event.priceId);
    expect(GUEST_CAPACITY_TOPUP.price_id).toBe(STRIPE_LIVE_CATALOGUE.guest_capacity_10.priceId);
  });
  it('maps eleven unique AUD one-time catalogue prices for active checkout', () => {
    const items = Object.values(STRIPE_LIVE_CATALOGUE);
    expect(items).toHaveLength(11);
    expect(new Set(items.map(item => item.priceId)).size).toBe(11);
    expect(new Set(items.map(item => item.productId)).size).toBe(11);
    expect(items.every(item => item.currency === 'aud' && item.unitAmount > 0)).toBe(true);
    expect(STRIPE_LIVE_ACCOUNT_ID).toBe('acct_1T0eMm5GzTmqOxGK');
    expect(PACKAGE_CHECKOUT_AVAILABLE).toBe(true);
  });
  it('preserves base package amounts and uses exclusive prices throughout', () => {
    expect(STRIPE_LIVE_CATALOGUE.essential.unitAmount).toBe(19900);
    expect(STRIPE_LIVE_CATALOGUE.premium.unitAmount).toBe(24900);
    expect(STRIPE_LIVE_CATALOGUE.unlimited.unitAmount).toBe(29900);
    expect(Object.values(STRIPE_LIVE_CATALOGUE).every(item => item.taxBehavior === 'exclusive')).toBe(true);
  });
});
