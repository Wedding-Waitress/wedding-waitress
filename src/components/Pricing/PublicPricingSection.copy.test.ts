import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/Pricing/PublicPricingSection.tsx', 'utf8');

describe('public pricing package-card copy and typography', () => {
  it('uses the approved access and post-expiry download wording', () => {
    expect(source).toContain('One event for 12 months');
    expect(source).toContain('+ 30 days free for downloads');
    expect(source).toContain('30-day downloads after expiry');
    expect(source).toContain('30-day downloads after subscription ends');
    expect(source).not.toContain('30-day download window after access ends');
    expect(source).not.toContain('30-day download window after the subscription ends');
  });

  it('keeps both feature-section headings at the same approved typography', () => {
    expect(source).toContain("const featureHeadingClass = 'text-[15px] font-semibold leading-5'");
    expect(source).toContain('<h4 className={`${featureHeadingClass} ${text}`}>What’s included</h4>');
    expect(source).toContain('<h5 className={`flex items-center gap-2 ${featureHeadingClass} ${text}`}>');
  });

  it('uses controlled desktop line breaks while allowing narrower layouts to wrap naturally', () => {
    expect(source).toContain('<br className="hidden 2xl:block" />');
    expect(source).toContain('<span className="2xl:hidden"> </span>');
    expect(source).toContain("desktopLines: ['Create invitations, Save the Dates and', 'Thank You Cards']");
    expect(source).toContain("desktopLines: ['Prepare kitchen dietary', 'requirement reports']");
    expect(source).toContain('firstLine="Download your photos, videos" secondLine="and platform exports."');
  });

  it('uses the compact AUD symbol only in the public pricing-card display', () => {
    expect(source).toContain("currency === 'AUD' ? formattedPrice.replace(/^A\\$/, '$') : formattedPrice");
    expect(source).toContain('formatPublicPricingPrice(effectiveCurrency, convertAudPrice(amount, effectiveCurrency, rates))');
  });

  it('promotes plan names to the former price size and steps prices down twice', () => {
    expect(source).toContain('className="text-4xl font-bold text-[#412419]"');
    expect(source).toContain('className="text-4xl font-bold !text-[#fff8ee]"');
    expect(source).toContain('min-h-[40px] text-2xl font-bold text-[#221b18]');
    expect(source).toContain('<span className="text-2xl font-bold">');
    expect(source).toContain('<span className="text-base text-[#ead5b7]">/month</span>');
  });
});
