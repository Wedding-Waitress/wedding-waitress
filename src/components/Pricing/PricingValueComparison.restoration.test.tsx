import React from 'react';
import { readFileSync } from 'node:fs';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PricingValueComparison } from './PricingValueComparison';
import { pricingComparisonRows, estimatedSeparateToolValueAud, valuedMainProductCount } from '@/content/pricingComparison';
import { publicPricingComparisonRows, publicPricingComparisonSources } from '@/i18n/publicPricingComparisonCopy';

describe('recovered public pricing comparison', () => {
  it('shows the comparison once after packages in place of the plan-details cards', () => {
    const source = readFileSync('src/pages/Pricing.tsx', 'utf8');
    const packages = source.indexOf('<PricingSection />');
    const comparison = source.indexOf('<PricingValueComparison />');
    expect(comparison).toBeGreaterThan(packages);
    expect(source.match(/<PricingValueComparison \/>/g)).toHaveLength(1);
    for (const removed of ['Plan details, without surprises', 'Guest capacity', 'Extensions', 'After 12 months']) expect(source).not.toContain(removed);
    const component = readFileSync('src/components/Pricing/PricingValueComparison.tsx', 'utf8');
    expect(component).toContain('className="ww-section ww-section-cream" aria-labelledby="platform-value-heading"');
    expect(component).not.toContain('ww-section bg-[#fffdf9]');
  });

  it('preserves the recovered rows, range label and calculated total', () => {
    expect(pricingComparisonRows).toHaveLength(24);
    expect(valuedMainProductCount).toBe(15);
    expect(estimatedSeparateToolValueAud).toBe(2205);
    const source = readFileSync('src/components/Pricing/PricingValueComparison.tsx', 'utf8');
    expect(source).toContain("const comparisonPriceLabel = 'Estimated $149 - $299';");
    expect(source).toContain('In total estimated cost of separate tools.');
    expect(source).not.toContain('Estimated separate-tool value');
    expect(source).toContain('md:block');
    expect(source).toContain('md:hidden');
  });

  it.each(Object.keys(publicPricingComparisonRows))('renders the recovered comparison in %s', async language => {
    const i18n = createInstance();
    await i18n.init({ lng: language, fallbackLng: 'en', resources: {}, initImmediate: false });
    const { container } = render(<I18nextProvider i18n={i18n}><PricingValueComparison /></I18nextProvider>);
    const translations = publicPricingComparisonRows[language];
    expect(translations).toHaveLength(publicPricingComparisonSources.length);
    const text = container.textContent?.replace(/\s+/g, ' ');
    for (const [index, translation] of translations.slice(0,64).entries()) if (![16,17].includes(index)) expect(text).toContain(pricingComparisonRows.some(row => [row.category,row.product,row.replaces].includes(publicPricingComparisonSources[index])) ? translation.trim().replace(/[-‐‑–—]/g, ' ').replace(/\s+/g, ' ') : translation.trim());
    expect(screen.getByLabelText(translations[64])).toBeInTheDocument();
    expect(container.querySelectorAll('table tbody tr').length).toBeGreaterThanOrEqual(23);
    expect(container.querySelectorAll('article')).toHaveLength(24);
    expect(text).toContain('$2,200 +');
    expect(text).not.toContain('A$2,205+');
    expect(container.querySelectorAll('tfoot td[colspan="3"] [data-pricing-comparison-total]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-pricing-comparison-total]')).toHaveLength(2);
    expect(text).not.toContain('Bundled subfeatures are not counted again.');
    expect(text).not.toContain('Wedding Waitress from ');
    if (language !== 'en') expect(text).not.toContain(publicPricingComparisonSources[1]);
  });
});


