import React from 'react';
import { ArrowRight, Building2, Camera, CircleCheck, Gem, Heart, Zap } from 'lucide-react';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import type { SignUpPlanContext } from '@/components/auth/SignUpModal';
import { Button } from '@/components/ui/enhanced-button';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import type { CurrencyCode } from '@/lib/currencyPricing';
import { useLiveExchangeRates } from '@/hooks/useLiveExchangeRates';
import { AUD_BASE_PRICES, convertAudPrice, formatLivePrice } from '@/lib/liveCurrencyPricing';
import { PUBLIC_COUPLE_PLAN_DETAILS, type PlanKey } from './pricingPlans';
import { PricingCurrencyPanel } from './PricingCurrencyPanel';

const formatPublicPricingPrice = (currency: CurrencyCode, amount: number) =>
  formatLivePrice(currency, amount);

type PlatformFeature = {
  label: string;
  desktopLines?: readonly [string, string];
};

const platformFeatures: readonly PlatformFeature[] = [
  { label: 'Create and manage your event' },
  { label: 'Build your guest list and track RSVPs' },
  { label: 'Create tables and assign seats' },
  { label: 'Generate a QR code seating chart' },
  { label: 'Design print-ready seating chart signs' },
  {
    label: 'Create invitations, Save the Dates and Thank You Cards',
    desktopLines: ['Create invitations, Save the Dates and', 'Thank You Cards'],
  },
  { label: 'Design guest name place cards' },
  { label: 'Generate individual table charts' },
  { label: 'Plan your ceremony floor layout' },
  { label: 'Plan your reception floor layout' },
  {
    label: 'Prepare kitchen dietary requirement reports',
    desktopLines: ['Prepare kitchen dietary', 'requirement reports'],
  },
  { label: 'Export a complete seating chart' },
  { label: 'Run a guest lookup kiosk at your venue' },
  { label: 'Complete your DJ & MC questionnaire' },
  { label: 'Create and share your event run sheet' },
] as const;

const sharingFeatures = [
  'Customise your photo and video sharing app',
  'Create a guest photo and video gallery',
  'Personalise your digital guestbook',
  'Customise your digital photo booth',
  'Display guest uploads in a live slideshow',
] as const;

type CoupleKey = Exclude<PlanKey, 'vendor_pro'>;

const couplePlans: Array<{ key: CoupleKey; icon: typeof Zap; popular?: boolean }> = [
  { key: 'essential', icon: Zap },
  { key: 'premium', icon: Gem, popular: true },
  { key: 'unlimited', icon: Heart },
];

const ResponsiveTwoLineText: React.FC<{ firstLine: string; secondLine: string }> = ({ firstLine, secondLine }) => (
  <>
    {firstLine}
    <br className="hidden 2xl:block" />
    <span className="2xl:hidden"> </span>
    {secondLine}
  </>
);

const FeatureLabel: React.FC<{ feature: PlatformFeature }> = ({ feature }) => (
  <span>
    {feature.desktopLines ? (
      <ResponsiveTwoLineText firstLine={feature.desktopLines[0]} secondLine={feature.desktopLines[1]} />
    ) : feature.label}
  </span>
);

const featureHeadingClass = 'text-[15px] font-semibold leading-5';

const PlanFeatureList: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const text = dark ? 'text-[#fff8ee]' : 'text-[#412419]';
  const icon = dark ? 'text-[#ead5b7]' : 'text-[#5b3425]';
  return (
    <div className="mt-6 border-t border-[#d7b985]/45 pt-5">
      <h4 className={`${featureHeadingClass} ${text}`}>What’s included</h4>
      <ul className="mt-3 space-y-2" aria-label="Complete platform products">
        {platformFeatures.map((feature) => (
          <li key={feature.label} className={`flex gap-2 text-[13px] font-normal leading-[18px] ${text}`}>
            <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} />
            <FeatureLabel feature={feature} />
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-[#d7b985]/35 pt-4">
        <h5 className={`flex items-center gap-2 ${featureHeadingClass} ${text}`}>
          <Camera size={15} strokeWidth={1.8} aria-hidden="true" className={icon} />
          Photo &amp; Video Sharing Suite
        </h5>
        <ul className="mt-3 space-y-2" aria-label="Photo and video sharing suite features">
          {sharingFeatures.map((feature) => (
            <li key={feature} className={`flex gap-2 text-[13px] font-normal leading-[18px] ${text}`}>
              <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Cta: React.FC<{ plan: PlanKey; name: SignUpPlanContext['name']; currency: CurrencyCode; prominent?: boolean }> = ({ plan, name, currency, prominent }) => (
  <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp signUpPlan={{ key: plan, name, currency }}>
    <Button variant={prominent ? 'default' : 'outline'} className={`w-full rounded-xl ${prominent ? 'ww-button-espresso' : ''}`} aria-label={`Start planning with ${name}`}>
      <span className="inline-flex items-center justify-center gap-2">Start Planning Free<ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" /></span>
    </Button>
  </AuthGatedCtaLink>
);

export const PublicPricingSection: React.FC = () => {
  const { currency, setCurrency } = useCurrencyContext();
  const { rates, loading, error } = useLiveExchangeRates();
  const effectiveCurrency: CurrencyCode = error || loading ? 'AUD' : currency;
  const display = (amount: number) =>
    formatPublicPricingPrice(effectiveCurrency, convertAudPrice(amount, effectiveCurrency, rates));

  return (
    <section id="pricing" className="overflow-x-clip px-4 py-14 md:py-16" aria-labelledby="public-pricing-heading">
      <div className="mx-auto max-w-[1600px]">
        <h2 id="public-pricing-heading" className="text-center text-3xl font-bold text-[#412419] sm:text-4xl md:text-5xl">Simple, Transparent Pricing</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-7 text-[#6f625b]">Couple plans are one-time payments for one event and 12 months of complete platform access.</p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[#6f625b]">Advertised prices exclude GST. Australian GST is added once at checkout where applicable.</p>
        <p className="mt-4 text-center text-base font-medium text-[#412419]">7-day free trial · Up to 20 guests · No credit card required</p>
        <PricingCurrencyPanel currency={effectiveCurrency} onChange={setCurrency} loading={loading} error={error} />
        <p className="sr-only" aria-live="polite">Prices are shown in {effectiveCurrency}.</p>
        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 2xl:grid-cols-4">
          {couplePlans.map(({ key, icon: Icon, popular }) => {
            const details = PUBLIC_COUPLE_PLAN_DETAILS[key];
            const price = display(AUD_BASE_PRICES[key]);
            return (
              <article key={key} aria-labelledby={`${key}-plan-title`} className={`relative flex h-full flex-col rounded-[20px] bg-white p-7 shadow-[0_6px_30px_rgba(43,23,17,.10)] ${popular ? 'border-2 border-[#70452f]' : 'border border-[#e7d8c7]'}`}>
                {popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="ww-button-espresso inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white"><Gem size={14} strokeWidth={1.8} aria-hidden="true" />Most Popular</span></div>}
                <div className={`flex items-center gap-2 ${popular ? 'mt-2' : ''}`}><Icon size={22} strokeWidth={1.8} aria-hidden="true" className="text-[#5b3425]" /><h3 id={`${key}-plan-title`} className="text-4xl font-bold text-[#412419]">{details.name}</h3></div>
                <p className="mt-5 min-h-[40px] text-2xl font-bold text-[#221b18]" aria-label={`${details.name}, ${price} one-time`}>{price}</p>
                <div className="mt-3 leading-6">
                  <p className="font-semibold text-[#412419]">Up to {details.guests} guests</p>
                  <p className="text-sm text-[#6f625b]">One event for 12 months</p>
                  <p className="text-xs leading-[17px] text-[#8d7c72]">+ 30 days free for downloads</p>
                </div>
                <ul className="mt-6 space-y-2 border-t border-[#e7d8c7] pt-5">
                  {['One event', 'Complete platform access', '12 months of access', '30-day downloads after expiry'].map((benefit) => <li key={benefit} className="flex gap-2 text-[13px] leading-[18px] text-[#412419]"><CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-[#5b3425]" />{benefit}</li>)}
                </ul>
                <p className="mt-2 pl-[22px] text-xs leading-[17px] text-[#6f625b]"><ResponsiveTwoLineText firstLine="Download your photos, videos" secondLine="and platform exports." /></p>
                <PlanFeatureList />
                <div className="mt-auto pt-7"><Cta plan={key} name={details.name} currency={effectiveCurrency} prominent={popular} /><p className="mt-2 text-center text-xs text-[#8d7c72]">7-day free trial included</p></div>
              </article>
            );
          })}

          <article aria-labelledby="vendor-plan-title" className="ww-public-dashboard-background relative flex h-full flex-col rounded-[20px] border border-[#d7b985]/65 p-7 text-[#fff8ee] shadow-[0_8px_35px_rgba(20,8,4,.28)]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="rounded-full border border-[#d7b985]/70 bg-[#f6efe5] px-4 py-1.5 text-xs font-semibold whitespace-nowrap text-[#412419] shadow-md">For Venues &amp; Vendors</span></div>
            <div className="mt-2 flex items-center gap-2"><Building2 size={22} strokeWidth={1.8} aria-hidden="true" className="text-[#ead5b7]" /><h3 id="vendor-plan-title" className="text-4xl font-bold !text-[#fff8ee]">Vendor Pro</h3></div>
            <p className="mt-5 flex min-h-[40px] items-baseline gap-2 text-[#fff8ee]" aria-label={`Vendor Pro, ${display(AUD_BASE_PRICES.vendor_pro)} per month`}><span className="text-2xl font-bold">{display(AUD_BASE_PRICES.vendor_pro)}</span><span className="text-base text-[#ead5b7]">/month</span></p>
            <div className="mt-3 leading-6"><p className="font-semibold text-[#fff8ee]">For venues, vendors and event professionals</p><p className="text-sm text-[#ead5b7]">Monthly subscription · Approval required</p></div>
            <ul className="mt-6 space-y-2 border-t border-[#d7b985]/45 pt-5">
              {['For venues and event professionals', 'For wedding planners', 'For DJs and MCs', 'Up to 100 active events', 'Complete platform access', 'Monthly subscription', 'Approval required', '30-day downloads after subscription ends'].map((benefit) => <li key={benefit} className="flex gap-2 text-[13px] leading-[18px] text-[#fff8ee]"><CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-[#ead5b7]" />{benefit}</li>)}
            </ul>
            <p className="mt-2 pl-[22px] text-xs leading-[17px] text-[#ead5b7]/80"><ResponsiveTwoLineText firstLine="Download your photos, videos" secondLine="and platform exports." /></p>
            <PlanFeatureList dark />
            <div className="mt-auto pt-7"><Cta plan="vendor_pro" name="Vendor Pro" currency={effectiveCurrency} prominent /><p className="mt-3 text-center text-xs font-medium text-[#ead5b7]">Approval required</p></div>
          </article>
        </div>
        <p className="mt-10 text-center text-base font-medium text-[#412419]">Start with the free trial, then choose the capacity your event needs.</p>
      </div>
    </section>
  );
};
