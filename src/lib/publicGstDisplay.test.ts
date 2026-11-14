import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gstInclusiveAud, PACKAGE_PRICES_AUD } from './packagePricing';
import { formatPublicPricingPrice } from './liveCurrencyPricing';
import { publicGstRows, publicGstSources } from '../i18n/publicGstCopy';
import { publicPlanFaqRows, publicPlanFaqSources } from '../i18n/publicPlanFaqCopy';

describe('GST-inclusive customer display', () => {
  it('direction-isolates monetary breakdowns for Arabic RTL', () => {
    const source = readFileSync('src/components/Pricing/PublicPricingSection.tsx', 'utf8');
    expect(source).toContain('<bdi dir="ltr">{displayCouplePrice(basePrice)}</bdi>');
    expect(source).toContain('<bdi dir="ltr">{displayCouplePrice(Math.round(basePrice * 10) / 100)}</bdi>');
  });
  it.each([['essential', '$218.90'], ['premium', '$273.90'], ['unlimited', '$328.90']] as const)(
    'preserves cents for %s', (key, total) => {
      expect(formatPublicPricingPrice('AUD', gstInclusiveAud(PACKAGE_PRICES_AUD[key]))).toBe(total);
      expect(formatPublicPricingPrice('AUD', PACKAGE_PRICES_AUD[key])).toBe(`$${PACKAGE_PRICES_AUD[key]}`);
    });
  it.each(['en','it','ar','zh','vi','hi','tr','de','es','fr','nl','ja','el'])(
    'synchronizes tax and extension copy in %s', language => {
      expect(publicGstRows[language]).toHaveLength(publicGstSources.length);
      expect(publicGstRows[language].every(text => text.trim().length > 0)).toBe(true);
      expect(publicPlanFaqRows[language][9]).toBe(publicGstRows[language][4]);
      expect(publicPlanFaqRows[language][5]).toContain('A$22');
      expect(publicPlanFaqRows[language][5]).not.toContain('A$20');
      expect(publicPlanFaqRows[language][5]).toContain(publicGstRows[language][0]);
    });
  it('keeps the English FAQ source and translations identical', () => {
    expect(publicPlanFaqRows.en).toEqual(publicPlanFaqSources);
  });
});
