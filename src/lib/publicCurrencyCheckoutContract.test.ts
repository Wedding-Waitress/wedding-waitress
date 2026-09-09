import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const header = readFileSync('src/components/Layout/Header.tsx', 'utf8');
const checkout = readFileSync('supabase/functions/create-checkout/index.ts', 'utf8');

describe('public pricing and checkout currency contract', () => {
  it('removes the header currency selector while retaining language selection', () => {
    expect(header).not.toContain('<CurrencySelector');
    expect(header).toContain('handleLanguageChange');
    expect(header).toContain('<Globe');
  });

  it('validates plan and currency server-side and never accepts a client amount', () => {
    expect(checkout).toContain('PUBLIC_PLAN_CATALOG');
    expect(checkout).toContain('isPricingCurrency(pricing_currency)');
    expect(checkout).not.toMatch(/client_amount|submitted_amount|unit_amount\s*:\s*amount/);
    expect(checkout).toContain('convertedAmountCents(publicPlan.baseAud');
    expect(checkout).toContain('baseAud: 199');
    expect(checkout).toContain('baseAud: 249');
    expect(checkout).toContain('baseAud: 299');
  });

  it('keeps only the three active couple plans in public checkout', () => {
    expect(checkout).not.toContain('vendor_pro:');
    expect(checkout.match(/mode: "payment"/g)).toHaveLength(3);
  });
});
