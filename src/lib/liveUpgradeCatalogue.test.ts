import { describe, expect, it } from 'vitest';
import { LIVE_UPGRADE_CATALOGUE, liveUpgradeFor, validateLiveUpgradePrice } from '../../supabase/functions/_shared/liveUpgradeCatalogue';
import { STRIPE_LIVE_CATALOGUE } from './stripeLiveCatalogue';

describe('dedicated live upgrade catalogue', () => {
  it.each([
    ['essential', 'premium', 5000],
    ['premium', 'unlimited', 5000],
    ['essential', 'unlimited', 10000],
  ] as const)('binds %s to %s at the exact difference', (from, to, difference) => {
    const sku = liveUpgradeFor(from, to);
    const key = `${from}_to_${to}` as keyof typeof LIVE_UPGRADE_CATALOGUE;
    expect(STRIPE_LIVE_CATALOGUE[key]).toMatchObject(sku);
    expect(validateLiveUpgradePrice({ object: 'price', id: sku.priceId, product: sku.productId,
      active: true, livemode: true, currency: 'aud', type: 'one_time', recurring: null,
      tax_behavior: 'exclusive', unit_amount: difference }, from, to, difference)).toBe(sku);
  });
  it.each([['premium', 'essential'], ['unlimited', 'premium'], ['essential', 'essential'], ['__proto__', 'premium']])(
    'rejects unsupported %s to %s', (from, to) => expect(() => liveUpgradeFor(from, to)).toThrow());
  it.each([
    { active: false }, { livemode: false }, { currency: 'usd' }, { type: 'recurring' },
    { recurring: {} }, { tax_behavior: 'inclusive' }, { unit_amount: 24900 },
    { id: 'price_Foreign' }, { product: 'ww_live_20260914_v2_premium' },
  ])('rejects mismatched provider evidence %j', patch => {
    const sku = liveUpgradeFor('essential', 'premium');
    expect(() => validateLiveUpgradePrice({ object: 'price', id: sku.priceId, product: sku.productId,
      active: true, livemode: true, currency: 'aud', type: 'one_time', recurring: null,
      tax_behavior: 'exclusive', unit_amount: 5000, ...patch }, 'essential', 'premium', 5000)).toThrow();
  });
});
