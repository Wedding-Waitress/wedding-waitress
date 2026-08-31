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
  });

  it('keeps couple plans one-time and Vendor Pro recurring monthly', () => {
    // These are intentionally the untouched Stripe-side amounts until the later handover.
    expect(checkout).toContain('vendor_pro: { product: "prod_UTm2XBA5rX9dGN", baseAud: 299, mode: "subscription" }');
    expect(checkout.match(/mode: "payment"/g)).toHaveLength(3);
    expect(checkout).toContain('recurring: { interval: "month" as const }');
  });
});
