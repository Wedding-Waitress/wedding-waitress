import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/components/Pricing/PublicPricingSection.tsx', 'utf8');

describe('public pricing package-card copy and typography', () => {
  it('places the approved recovery wording directly with the duration without duplicate list copy', () => {
    expect(source).toMatch(/>One event for 12 months<\/p>\s*<p[^>]*>Additional events available to purchase<\/p>\s*<p[^>]*>Account recovery: 6 months after access ends\.<\/p>\s*<p[^>]*>Complete platform access<\/p>/);
    expect(source).toContain('Account recovery: 6 months after access ends.');
    expect(source).not.toContain('Six-month account recovery after access ends');
    expect(source).toContain('Free Email &amp; SMS Credits Included');
    expect(source).not.toContain('Extend anytime for A$20 per month, paid upfront');
    expect(source).not.toContain("'12 months of access'");
    expect(source).not.toMatch(/\[[^\]]*'Complete platform access'/);
    expect(source).not.toContain('downloads after expiry');
    expect(source).not.toContain('download window');
  });

  it('matches the two feature-section headings at the approved typography', () => {
    expect(source).toContain("const featureHeadingClass = 'text-base font-semibold leading-5'");
    expect(source).toContain('<h4 className={`flex w-full items-center justify-center gap-2 border-2 border-[#70452f] px-3 py-2 text-center ${featureHeadingClass} ${text}`}>');
    expect(source).toContain('src="/images/brand/wedding-waitress-favicon-dark-brown.png"');
    expect(source).toContain('className="h-6 w-6 shrink-0 object-contain"');
    expect(source).toContain('What’s Included');
    expect(source).toContain('<h5 className={`flex w-full items-center justify-center gap-2 border-2 border-[#70452f] px-3 py-2 text-center text-base font-semibold leading-5 ${text}`}>');
  });

  it('uses controlled desktop line breaks while allowing narrower layouts to wrap naturally', () => {
    expect(source).toContain('<br className="hidden 2xl:block" />');
    expect(source).toContain('<span className="2xl:hidden"> </span>');
    expect(source).toContain("emphasisLines: ['Invitations, Save the Dates and', 'Thank You Cards']");
    expect(source).toContain("emphasisLines: ['Kitchen Dietary', 'Requirement Reports']");
    expect(source).not.toContain('firstLine="Download your photos, videos" secondLine="and platform exports."');
  });

  it('uses the public AUD formatter for all active couple plans', () => {
    expect(source).toContain("formatPublicPricingPrice('AUD', amount)");
    expect(source).toContain('displayCouplePrice(AUD_BASE_PRICES[key])');
    expect(source).not.toContain('useLiveExchangeRates');
    expect(source).not.toContain('<PricingCurrencyPanel');
    expect(source).not.toContain('Vendor Pro');
  });

  it('places plan credits first under What’s included and removes the redundant lower event row', () => {
    expect(source).toContain('<PlanFeatureList communicationCredits={details.communicationCredits} />');
    expect(source).toMatch(/What’s Included\s*<\/h4>\s*<ul[^>]*>\s*<li[^>]*font-bold[^>]*>[\s\S]*?\{communicationCredits\} Free Email &amp; SMS Credits Included<\/span>/);
    expect(source).not.toContain("[`${details.communicationCredits} Email & SMS credits included`, 'One event']");
  });

  it('bolds only the named Title Case feature phrases while preserving sentence-case connectors', () => {
    expect(source).toContain("{ prefix: 'Create and', emphasis: 'Manage Your Event' }");
    expect(source).toMatch(/\{ prefix: 'Create and', emphasis: 'Manage Your Event' \},\s*\{ prefix: '', emphasis: 'Wedding & Event Budget Planner' \}/);
    expect(source).not.toContain("emphasis: 'Event Budget Planner'");
    expect(source).toContain("{ prefix: 'Build your', emphasis: 'Guest List and Track RSVPs' }");
    expect(source).toContain("{ prefix: 'Generate a', emphasis: 'QR Code Seating Chart' }");
    expect(source).toContain("{ prefix: 'Design print ready', emphasis: 'Seating Chart Signs' }");
    expect(source).not.toContain('print-ready');
    expect(source).toContain("{ prefix: 'Create your', emphasis: 'Ceremony Floor Plan Layout' }");
    expect(source).toContain("{ prefix: 'Create your', emphasis: 'Reception Floor Plan Layout' }");
    expect(source).toContain("{ prefix: 'Complete your', emphasis: 'DJ & MC Questionnaire' }");
    expect(source).toContain('<span className="font-bold">');
    expect(source).toContain('<React.Fragment key={feature.emphasis}>');
    expect(source).toContain('<li className={`flex gap-2 text-[13px] font-normal leading-[18px]');
  });

  it('adds the exact single-line Find Your Seat companion directly after the QR feature', () => {
    expect(source).toContain("feature.emphasis === 'QR Code Seating Chart'");
    expect(source).toContain('data-find-your-seat-app');
    expect(source).toContain('flex items-center gap-2 whitespace-nowrap text-[13px] font-normal leading-[18px]');
    expect(source).toContain('<span><span className="font-bold">Scan QR Code</span> to <span className="font-bold">Find Your Seat</span></span>');
    expect(source).not.toContain('Find Your Seat App — Scan the QR Code');
  });

  it('uses Premium’s two-pixel square espresso border only on the sharing suite heading', () => {
    expect(source).toContain('<div className="mt-5">');
    expect(source).toContain('flex w-full items-center justify-center gap-2 border-2 border-[#70452f] px-3 py-2 text-center');
    expect(source).not.toMatch(/border-2 border-\[#70452f\][^"\n]*rounded/);
  });

  it('emphasises only the capitalised Photo and Video Sharing App phrase without resizing it', () => {
    expect(source).toContain("{ prefix: 'Customize your', name: 'Photo and Video Sharing App' }");
    expect(source).toContain("{ prefix: 'Create a guest', name: 'Photo and Video Gallery' }");
    expect(source).toContain("{ prefix: '', name: 'Digital Guestbook' }");
    expect(source).toContain("{ prefix: 'Customise your', name: 'Digital Photo Booth' }");
    expect(source).toContain("{ prefix: 'Display', name: 'Guest Uploads in a Live Slideshow' }");
    expect(source).toContain('<span>{feature.prefix} <span className="font-bold">{feature.name}</span></span>');
    expect(source).not.toContain('Customise your photo and video sharing app');
  });

  it('renders the approved bold guestbook wording with one decorative espresso heart icon', () => {
    expect(source).toContain("feature.name === 'Digital Guestbook'");
    expect(source).toContain('<span className="font-bold">Digital Guestbook</span>');
    expect(source).toContain('<span className="font-bold">Audio &amp; Video</span>');
    expect(source).not.toContain('Audio Guestbook');
    expect(source).not.toContain('Video Guestbook');
    const sharingSection = source.slice(source.indexOf("{sharingFeatures.map"), source.indexOf('const Cta:'));
    expect(sharingSection.match(/<Heart size=\{11\} strokeWidth=\{2\} aria-hidden="true" className="text-\[#412419\]" \/>/g)).toHaveLength(1);
    expect(source.match(/<span className="sr-only">, <\/span>/g)).toHaveLength(1);
    expect(source).not.toContain("'Personalise your'");
  });

  it('keeps the selected pricing introduction while removing the standalone GST sentence', () => {
    expect(source).toContain('Simple, Transparent &amp; Fair Pricing');
    expect(source).not.toContain('>Simple, Transparent Pricing</h2>');
    expect(source).not.toContain('Everything you need to plan your wedding and event, all in one place.');
    expect(source).not.toContain('Couple plans are one-time payments for one event and 12 months of complete platform access.');
    expect(source).not.toContain('Advertised prices exclude GST. Australian GST is added once at checkout where applicable.');
    expect(source).toContain('mt-4 text-center text-lg font-bold leading-7 text-[#412419]');
    expect(source).toContain('7 days free trial · Up to 20 guests · No credit card required');
  });

  it('uses a moderately wider centred currency notice with two equally bold blocks', () => {
    expect(source).toContain('data-pricing-currency-notice');
    expect(source).toContain('mx-auto mt-7 max-w-3xl space-y-1');
    expect(source).toMatch(/<p className="font-bold">Wedding Waitress is available worldwide\. All prices are in Australian dollars \(AUD\)\.<\/p>\s*<p className="font-bold">Your card provider may convert an AUD charge and may apply its own exchange rate or fees\.<\/p>/);
  });

  it('keeps the approved free-trial reassurance beneath every plan CTA', () => {
    expect(source).toContain('<span>7 days free trial included</span>');
    expect(source).toContain('<strong className="font-bold text-[#412419]">No credit card required</strong>');
    expect(source).toContain('<Heart size={11} strokeWidth={2} aria-hidden="true" className="text-[#412419]" />');
  });

  it('promotes plan names to the former price size and keeps the standalone AUD row removed', () => {
    expect(source).toContain('className="text-4xl font-bold text-[#412419]"');
    expect(source).toContain('mt-5 text-2xl font-bold text-[#221b18]');
    expect(source).not.toContain('>AUD</p>');
  });

  it('aligns the equal-width plan-card row to the public 1180px comparison container', () => {
    expect(source).toContain('data-public-pricing-card-grid');
    expect(source).toContain('mx-auto mt-12 grid w-full max-w-[1180px]');
    expect(source).toContain('grid-cols-1');
    expect(source).toContain('md:grid-cols-2');
    expect(source).toContain('xl:grid-cols-3');
  });

  it('uses espresso CTAs for the outside plans and the established green for Premium', () => {
    expect(source).toContain("green ? 'ww-pricing-button-green' : 'ww-button-espresso'");
    expect(source).toContain('green={popular}');
    expect(source).toContain('ww-pricing-button-green inline-flex items-center');
  });

  it('uses a delicate heart-and-sparkle motif only for the Essential plan title', () => {
    expect(source).toContain("{ key: 'essential', icon: Heart }");
    expect(source).toContain("key === 'essential'");
    expect(source).toContain('<Heart size={22} strokeWidth={1.8} className="text-[#5b3425]" />');
    expect(source).toContain('<Sparkles size={9} strokeWidth={1.8} className="absolute -right-1 -top-1 text-[#5b3425]" />');
    expect(source).not.toContain("icon: Zap");
  });

  it('uses distinct clinking celebration glasses only for the Ultimate plan title', () => {
    expect(source).toContain("{ key: 'unlimited', icon: Wine }");
    expect(source).toContain("key === 'unlimited'");
    expect(source).toContain('<Wine size={20} strokeWidth={1.8} className="absolute left-0 top-0.5 -rotate-12 text-[#5b3425]" />');
    expect(source).toContain('<Wine size={20} strokeWidth={1.8} className="absolute right-0 top-0.5 rotate-12 text-[#5b3425]" />');
  });
});
