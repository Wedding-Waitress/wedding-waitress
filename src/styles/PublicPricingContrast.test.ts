import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

describe('public Pricing dark-surface contrast', () => {
  const pricing = read('src/components/Pricing/PublicPricingSection.tsx');
  const comparison = read('src/components/Pricing/PricingValueComparison.tsx');
  const styles = read('src/styles/PublicSite.css');

  it('marks only the Vendor Pro card and Wedding Waitress value panel as Pricing dark surfaces', () => {
    expect(pricing).toContain('data-pricing-dark-surface="vendor-pro"');
    expect(pricing).toMatch(
      /data-pricing-dark-surface="vendor-pro" data-solid-text-surface="dark"/,
    );
    expect(pricing).toContain('data-pricing-vendor-badge');
    expect(comparison).toContain('data-pricing-dark-surface="wedding-waitress-value"');
    expect(comparison).toMatch(
      /data-pricing-dark-surface="wedding-waitress-value" data-solid-text-surface="dark"/,
    );
    expect(comparison).not.toMatch(
      /data-pricing-dark-surface=["'](?:estimated|separate-tools|separate-tool-value)/,
    );
  });

  it('forces fully opaque white copy and icons within only those two surfaces', () => {
    expect(styles).toMatch(
      /\.ww-pricing-page\s+:where\(\s*\[data-pricing-dark-surface="vendor-pro"\],\s*\[data-pricing-dark-surface="wedding-waitress-value"\]\s*\)[\s\S]*?color: #ffffff !important;\s*-webkit-text-fill-color: #ffffff !important;\s*opacity: 1 !important;/,
    );
  });

  it('preserves the existing dark badge text outside the Vendor Pro surface', () => {
    expect(styles).toMatch(
      /#vendor-plan-badge\[data-pricing-vendor-badge\] \{\s*color: #412419 !important;\s*-webkit-text-fill-color: #412419 !important;/,
    );
  });
});
