import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAN_PRICES, VENDOR_PRO } from './stripePrices';
import { gstInclusiveAud, PACKAGE_CHECKOUT_AVAILABLE, PACKAGE_PRICES_AUD } from './packagePricing';
import { PLAN_PRICING, VENDOR_PRICING } from './currencyPricing';

describe('package pricing catalogue', () => {
  it('uses the approved ex-GST AUD prices and single GST calculation', () => {
    expect(PACKAGE_PRICES_AUD).toEqual({ essential: 199, premium: 249, unlimited: 299, vendor_pro: 300 });
    expect(Object.values(PACKAGE_PRICES_AUD).map(gstInclusiveAud)).toEqual([218.9, 273.9, 328.9, 330]);
  });

  it('recalculates all supported display currencies from the new AUD bases', () => {
    expect(PLAN_PRICING.USD).toMatchObject({ essential: { price: 131 }, premium: { price: 164 }, unlimited: { price: 197 } });
    expect(PLAN_PRICING.GBP).toMatchObject({ essential: { price: 101 }, premium: { price: 127 }, unlimited: { price: 152 } });
    expect(PLAN_PRICING.EUR).toMatchObject({ essential: { price: 119 }, premium: { price: 149 }, unlimited: { price: 179 } });
    expect(VENDOR_PRICING).toMatchObject({ AUD: { price: 300 }, USD: { price: 198 }, GBP: { price: 153 }, EUR: { price: 180 } });
  });

  it('uses the reviewed Stripe sandbox catalogue references', () => {
    expect(PLAN_PRICES.essential.price_id).toBe('price_1UDdle5GzTmqOxGKj3yu56jP');
    expect(PLAN_PRICES.premium.price_id).toBe('price_1UDeO75GzTmqOxGK2JYrvH7I');
    expect(PLAN_PRICES.unlimited.price_id).toBe('price_1UDeO95GzTmqOxGKZmJq53Ee');
    expect(VENDOR_PRO.price_id).toBe('price_1TUoUX5GzTmqOxGK4eswrMPQ');
  });

  it('blocks package checkout until Stripe has matching prices', () => {
    const checkoutPage = readFileSync('src/pages/UpgradeCheckout.tsx', 'utf8');
    expect(PACKAGE_CHECKOUT_AVAILABLE).toBe(false);
    expect(checkoutPage).toContain('if (!PACKAGE_CHECKOUT_AVAILABLE)');
    expect(checkoutPage).toContain('Australian total including GST');
  });

  it('publishes new structured prices and responsive pricing breakpoints', () => {
    const pricingPage = readFileSync('src/pages/Pricing.tsx', 'utf8');
    const cards = readFileSync('src/components/Pricing/PublicPricingSection.tsx', 'utf8');
    expect(pricingPage).toContain("price: String(PACKAGE_PRICES_AUD.essential)");
    expect(pricingPage).not.toContain("unitText: 'MONTH'");
    expect(cards).toContain('md:grid-cols-2 xl:grid-cols-3');
    expect(cards).toContain('one-time');
    expect(cards).not.toContain('Vendor Pro');
  });
});
