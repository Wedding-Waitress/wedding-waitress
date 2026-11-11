import { describe, expect, it, vi } from 'vitest';
import { worldwideGstAmounts, validateWorldwideGstRate, retrieveWorldwideGstRate, worldwideGstLineItem, validateWorldwideGstTotal, validateWorldwideGstCustomer } from '../../supabase/functions/_shared/worldwideGst';
import { STRIPE_LIVE_CATALOGUE } from './stripeLiveCatalogue';

describe('owner/accountant confirmed worldwide GST policy', () => {
  it('rejects exemptions and unowned customers before payment without overriding them', () => {
    const customer = { object: 'customer', id: 'cus_fixture', livemode: true, tax_exempt: 'none', metadata: { user_id: 'user' } };
    expect(validateWorldwideGstCustomer(customer, 'user', true)).toBe('cus_fixture');
    for (const change of [{ tax_exempt: 'exempt' }, { tax_exempt: 'reverse' }, { deleted: true }, { livemode: false }, { metadata: { user_id: 'other' } }]) {
      expect(() => validateWorldwideGstCustomer({ ...customer, ...change }, 'user', true)).toThrow('requires review');
    }
  });
  it.each(['AU', 'US', 'IT', 'NZ'])('uses the same fixed 10% policy for a buyer in %s', () => {
    expect(worldwideGstAmounts(19900)).toMatchObject({ taxCents: 1990, totalCents: 21890 });
    expect(worldwideGstAmounts(24900).totalCents).toBe(27390);
    expect(worldwideGstAmounts(29900).totalCents).toBe(32890);
  });
  for (const item of Object.values(STRIPE_LIVE_CATALOGUE)) {
    it.each([0, 50, 51, 100])(`${item.key}: taxes discounted base at %i percent`, percent => {
      const quote = worldwideGstAmounts(item.unitAmount, 1, percent);
      expect(quote.taxCents).toBe(Math.round(quote.taxableCents / 10));
      expect(quote.totalCents).toBe(quote.taxableCents + quote.taxCents);
      expect(() => validateWorldwideGstTotal(item.unitAmount, 1, percent, quote.totalCents, quote.taxCents)).not.toThrow();
      expect(() => validateWorldwideGstTotal(item.unitAmount, 1, percent, quote.totalCents + 1, quote.taxCents)).toThrow();
    });
  }
  it('handles quantity and free offers without double GST', () => {
    expect(worldwideGstAmounts(1000, 3).totalCents).toBe(3300);
    expect(worldwideGstAmounts(2000, 12).totalCents).toBe(26400);
    expect(worldwideGstAmounts(19900, 1, 100).totalCents).toBe(0);
    expect(worldwideGstLineItem({ price: 'price_fixture', quantity: 1 }, 'txr_Fixture').tax_rates).toEqual(['txr_Fixture']);
    expect(() => worldwideGstLineItem({ dynamic_tax_rates: [] }, 'txr_Fixture')).toThrow();
  });
  const rate = { object: 'tax_rate', id: 'txr_Fixture', active: true, livemode: true, inclusive: false, percentage: 10, tax_type: 'gst' };
  it('requires retrieved exclusive active GST evidence', async () => {
    const retrieve = vi.fn().mockResolvedValue(rate);
    expect(await retrieveWorldwideGstRate({ taxRates: { retrieve } }, rate.id, true)).toBe(rate.id);
    expect(retrieve).toHaveBeenCalledWith(rate.id);
    for (const change of [{ active: false }, { livemode: false }, { inclusive: true }, { percentage: 20 }, { tax_type: 'vat' }, { id: 'txr_Other' }]) {
      expect(() => validateWorldwideGstRate({ ...rate, ...change }, rate.id, true)).toThrow();
    }
    await expect(retrieveWorldwideGstRate({ taxRates: { retrieve } }, undefined, true)).rejects.toThrow();
  });
});

const approvedLegacyGst = { object: 'tax_rate', id: 'txr_1UFTuc5GzTmqOxGKlENAcBIO', active: true, livemode: true,
  inclusive: false, percentage: 10, tax_type: null, display_name: 'GST', country: 'AU' };
it('accepts the exact approved Australian manual GST rate with nullable optional classification', () => {
  expect(validateWorldwideGstRate(approvedLegacyGst, approvedLegacyGst.id, true)).toBe(approvedLegacyGst.id);
});
it.each([{ id: 'txr_other' }, { country: 'US' }, { display_name: 'VAT' }, { tax_type: 'vat' },
  { livemode: false }, { percentage: 11 }, { inclusive: true }, { active: false }])(
  'rejects substituted or altered manual GST evidence: %j', change => {
    expect(() => validateWorldwideGstRate({ ...approvedLegacyGst, ...change }, approvedLegacyGst.id, true)).toThrow();
  });