import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

describe('public Pricing dark-surface contrast', () => {
  const pricing = read('src/components/Pricing/PublicPricingSection.tsx');
  const comparison = read('src/components/Pricing/PricingValueComparison.tsx');
  const styles = read('src/styles/PublicSite.css');

  it('marks only the Wedding Waitress value panel as a Pricing dark surface', () => {
    expect(pricing).not.toContain('data-pricing-dark-surface');
    expect(pricing).not.toContain('data-pricing-vendor-badge');
    expect(comparison).toContain('data-pricing-dark-surface="wedding-waitress-value"');
    expect(comparison).toMatch(
      /data-pricing-dark-surface="wedding-waitress-value" data-solid-text-surface="dark"/,
    );
    expect(comparison).not.toMatch(
      /data-pricing-dark-surface=["'](?:estimated|separate-tools|separate-tool-value)/,
    );
  });

  it('forces fully opaque white copy and icons within that surface', () => {
    expect(styles).toMatch(
      /\.ww-pricing-page\s+\[data-pricing-dark-surface="wedding-waitress-value"\][\s\S]*?color: #ffffff !important;\s*-webkit-text-fill-color: #ffffff !important;\s*opacity: 1 !important;/,
    );
  });
});
