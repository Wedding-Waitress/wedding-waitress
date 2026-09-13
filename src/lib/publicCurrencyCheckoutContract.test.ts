import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const checkout = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');
const pricing = readFileSync('src/components/Pricing/PublicPricingSection.tsx', 'utf8');

describe('public pricing and checkout currency contract', () => {
  it('removes the header currency selector while retaining language selection', () => {
    expect(header).not.toContain('<CurrencySelector');
    expect(header).toContain('handleLanguageChange');
    expect(header).toContain('<Globe');
  });

  it('validates plan and currency server-side and never accepts a client amount', () => {
    expect(checkout).toContain('PUBLIC_PLAN_CATALOG');
    expect(checkout).toContain("pricing_currency !== 'AUD'");
    expect(checkout).not.toMatch(/client_amount|submitted_amount|unit_amount\s*:\s*amount/);
    expect(checkout).toContain('originalAmountCents = publicPlan.baseAud * 100');
    expect(checkout).not.toContain('getAudExchangeRates');
    expect(checkout).toContain('baseAud: 199');
    expect(checkout).toContain('baseAud: 249');
    expect(checkout).toContain('baseAud: 299');
  });

  it('shows public prices with page-level AUD disclosure and no currency selector', () => {
    expect(pricing).not.toContain('<PricingCurrencyPanel');
    expect(pricing).not.toContain('useLiveExchangeRates');
    expect(pricing).toContain('All prices are in Australian dollars (AUD).');
    expect(pricing).toContain('Your card provider may convert an AUD charge');
    expect(pricing).not.toContain('>AUD</p>');
  });

  it('keeps only the three active couple plans in public checkout', () => {
    expect(checkout).not.toContain('vendor_pro:');
    expect(checkout.match(/mode: "payment"/g)).toHaveLength(3);
  });
});
