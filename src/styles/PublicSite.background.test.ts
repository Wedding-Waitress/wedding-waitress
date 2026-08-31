import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public dashboard background reuse', () => {
  it('uses the authenticated application background variables for shared dark public surfaces', () => {
    const publicStyles = readFileSync('src/styles/PublicSite.css', 'utf8');
    const footer = readFileSync('src/components/Layout/PublicFooter.tsx', 'utf8');

    expect(publicStyles).toContain('.ww-public-dashboard-background,\n.ww-section-espresso');
    expect(publicStyles).toContain('background-color: var(--ww-application-background-color);');
    expect(publicStyles).toContain('background-image: var(--ww-application-background-image);');
    expect(publicStyles).toContain('background-position: var(--ww-application-background-position);');
    expect(publicStyles).toContain('background-repeat: var(--ww-application-background-repeat);');
    expect(publicStyles).toContain('background-size: var(--ww-application-background-size);');
    expect(footer).toContain('className="ww-public-dashboard-background px-4 py-14 text-white"');
    expect(footer).not.toContain('bg-[#171f2d]');
  });

  it('lets the long Pricing route establish natural document height around one shared footer', () => {
    const publicStyles = readFileSync('src/styles/PublicSite.css', 'utf8');
    const pricing = readFileSync('src/pages/Pricing.tsx', 'utf8');

    expect(pricing).toContain('ww-public ww-pricing-page min-h-screen');
    expect(pricing.match(/<PublicFooter \/>/g)).toHaveLength(1);
    expect(publicStyles).toContain('html:has(.ww-pricing-page),');
    expect(publicStyles).toContain('body:has(.ww-pricing-page),');
    expect(publicStyles).toContain('#root:has(.ww-pricing-page)');
    expect(publicStyles).toMatch(/#root:has\(\.ww-pricing-page\) \{\s*height: auto;/);
  });

  it('reuses the authenticated embossed secondary-button treatment for brown public CTAs', () => {
    const publicStyles = readFileSync('src/styles/PublicSite.css', 'utf8');
    const accountControls = readFileSync('src/components/Account/AccountControls.module.css', 'utf8');

    const approvedBackground = 'linear-gradient(180deg, rgba(255,244,225,.16) 0%, transparent 38%), linear-gradient(180deg, #70452f 0%, #4a2a20 55%, #2b1712 100%)';
    const approvedShadow = 'inset 0 1px rgba(255,244,225,.24), inset 0 -2px rgba(12,4,2,.38), 0 6px 14px rgba(13,5,3,.25)';

    expect(accountControls).toContain(approvedBackground);
    expect(accountControls).toContain(approvedShadow);
    expect(publicStyles).toContain('.ww-button-espresso');
    expect(publicStyles).toContain(approvedBackground);
    expect(publicStyles).toContain(approvedShadow);
    expect(publicStyles).toContain('outline: 3px solid rgba(247, 222, 187, .92) !important;');
    expect(publicStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
