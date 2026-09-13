import React from 'react';
import { ArrowRight, Camera, CircleCheck, Gem, Heart, Sparkles, Wine } from 'lucide-react';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import type { SignUpPlanContext } from '@/components/auth/SignUpModal';
import { Button } from '@/components/ui/enhanced-button';
import type { CurrencyCode } from '@/lib/currencyPricing';
import { AUD_BASE_PRICES, formatPublicPricingPrice } from '@/lib/liveCurrencyPricing';
import { PUBLIC_COUPLE_PLAN_DETAILS, type PlanKey } from './pricingPlans';

type PlatformFeature = {
  prefix: string;
  emphasis: string;
  suffix?: string;
  emphasisLines?: readonly [string, string];
};

const platformFeatures: readonly PlatformFeature[] = [
  { prefix: 'Create and', emphasis: 'Manage Your Event' },
  { prefix: '', emphasis: 'Wedding & Event Budget Planner' },
  { prefix: 'Build your', emphasis: 'Guest List and Track RSVPs' },
  { prefix: '', emphasis: 'Create Tables and Assign Seats' },
  { prefix: 'Generate a', emphasis: 'QR Code Seating Chart' },
  { prefix: 'Design print ready', emphasis: 'Seating Chart Signs' },
  {
    prefix: 'Create',
    emphasis: 'Invitations, Save the Dates and Thank You Cards',
    emphasisLines: ['Invitations, Save the Dates and', 'Thank You Cards'],
  },
  { prefix: 'Design guest', emphasis: 'Name Place Cards' },
  { prefix: 'Generate', emphasis: 'Individual Table Charts' },
  { prefix: 'Create your', emphasis: 'Ceremony Floor Plan Layout' },
  { prefix: 'Create your', emphasis: 'Reception Floor Plan Layout' },
  {
    prefix: 'Prepare',
    emphasis: 'Kitchen Dietary Requirement Reports',
    emphasisLines: ['Kitchen Dietary', 'Requirement Reports'],
  },
  { prefix: 'Export a', emphasis: 'Complete Seating Chart' },
  { prefix: 'Run a', emphasis: 'Guest Lookup Live Slideshow', suffix: 'at your venue' },
  { prefix: 'Complete your', emphasis: 'DJ & MC Questionnaire' },
  { prefix: 'Create and', emphasis: 'Share Your Event Run Sheet' },
] as const;

const sharingFeatures = [
  { prefix: 'Customize your', name: 'Photo and Video Sharing App' },
  { prefix: 'Create a guest', name: 'Photo and Video Gallery' },
  { prefix: '', name: 'Digital Guestbook' },
  { prefix: 'Customise your', name: 'Digital Photo Booth' },
  { prefix: 'Display', name: 'Guest Uploads in a Live Slideshow' },
] as const;

type CoupleKey = PlanKey;

const couplePlans: Array<{ key: CoupleKey; icon: typeof Heart; popular?: boolean }> = [
  { key: 'essential', icon: Heart },
  { key: 'premium', icon: Gem, popular: true },
  { key: 'unlimited', icon: Wine },
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
    {feature.prefix ? `${feature.prefix} ` : ''}
    <span className="font-bold">
      {feature.emphasisLines ? (
        <ResponsiveTwoLineText firstLine={feature.emphasisLines[0]} secondLine={feature.emphasisLines[1]} />
      ) : feature.emphasis}
    </span>
    {feature.suffix ? ` ${feature.suffix}` : ''}
  </span>
);

const featureHeadingClass = 'text-base font-semibold leading-5';

const PlanFeatureList: React.FC<{ communicationCredits: number; dark?: boolean }> = ({ communicationCredits, dark = false }) => {
  const text = dark ? 'text-[#fff8ee]' : 'text-[#412419]';
  const icon = dark ? 'text-[#ead5b7]' : 'text-[#5b3425]';
  return (
    <div className="mt-6 border-t border-[#d7b985]/45 pt-5">
      <h4 className={`flex w-full items-center justify-center gap-2 border-2 border-[#70452f] px-3 py-2 text-center ${featureHeadingClass} ${text}`}>
        <img
          src="/images/brand/wedding-waitress-favicon-dark-brown.png"
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="h-6 w-6 shrink-0 object-contain"
        />
        What’s Included
      </h4>
      <ul className="mt-3 space-y-2" aria-label="Complete platform products">
        <li className={`flex gap-2 text-[13px] font-bold leading-[18px] ${text}`}>
          <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} />
          <span>{communicationCredits} Free Email &amp; SMS Credits Included</span>
        </li>
        {platformFeatures.map((feature) => (
          <React.Fragment key={feature.emphasis}>
            <li className={`flex gap-2 text-[13px] font-normal leading-[18px] ${text}`}>
              <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} />
              <FeatureLabel feature={feature} />
            </li>
            {feature.emphasis === 'QR Code Seating Chart' && (
              <li data-find-your-seat-app className={`flex items-center gap-2 whitespace-nowrap text-[13px] font-normal leading-[18px] ${text}`}>
                <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`shrink-0 ${icon}`} />
                <span><span className="font-bold">Scan QR Code</span> to <span className="font-bold">Find Your Seat</span></span>
              </li>
            )}
          </React.Fragment>
        ))}
      </ul>
      <div className="mt-5">
        <h5 className={`flex w-full items-center justify-center gap-2 border-2 border-[#70452f] px-3 py-2 text-center text-base font-semibold leading-5 ${text}`}>
          <Camera size={15} strokeWidth={1.8} aria-hidden="true" className={icon} />
          Photo &amp; Video Sharing Suite
        </h5>
        <ul className="mt-3 space-y-2" aria-label="Photo and video sharing suite features">
          {sharingFeatures.map((feature) => (
            <li key={feature.name} className={`flex gap-2 text-[13px] font-normal leading-[18px] ${text}`}>
              <CircleCheck size={14} strokeWidth={1.8} aria-hidden="true" className={`mt-0.5 shrink-0 ${icon}`} />
              {feature.name === 'Digital Guestbook' ? (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="font-bold">Digital Guestbook</span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="sr-only">, </span>
                    <Heart size={11} strokeWidth={2} aria-hidden="true" className="text-[#412419]" />
                    <span className="font-bold">Audio &amp; Video</span>
                  </span>
                </span>
              ) : (
                <span>{feature.prefix} <span className="font-bold">{feature.name}</span></span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Cta: React.FC<{ plan: PlanKey; name: SignUpPlanContext['name']; currency: CurrencyCode; green?: boolean }> = ({ plan, name, currency, green }) => (
  <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp signUpPlan={{ key: plan, name, currency }}>
    <Button className={`w-full rounded-xl ${green ? 'ww-pricing-button-green' : 'ww-button-espresso'}`} aria-label={`Start planning with ${name}`}>
      <span className="inline-flex items-center justify-center gap-2">Start Planning Free<ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" /></span>
    </Button>
  </AuthGatedCtaLink>
);

export const PublicPricingSection: React.FC = () => {
  const effectiveCurrency: CurrencyCode = 'AUD';
  const displayCouplePrice = (amount: number) => formatPublicPricingPrice('AUD', amount);

  return (
    <section id="pricing" className="overflow-x-clip px-4 py-14 md:py-16" aria-labelledby="public-pricing-heading">
      <div className="mx-auto max-w-[1600px]">
        <h2 id="public-pricing-heading" className="text-center text-3xl font-bold text-[#412419] sm:text-4xl md:text-5xl">Simple, Transparent &amp; Fair Pricing</h2>
        <p className="mt-4 text-center text-lg font-bold leading-7 text-[#412419]">7 days free trial · Up to 20 guests · No credit card required</p>
        <div data-pricing-currency-notice className="mx-auto mt-7 max-w-3xl space-y-1 rounded-xl border border-[#d7b985]/65 bg-[#f6efe5] px-5 py-4 text-center text-sm leading-6 text-[#412419]">
          <p className="font-bold">Wedding Waitress is available worldwide. All prices are in Australian dollars (AUD).</p>
          <p className="font-bold">Your card provider may convert an AUD charge and may apply its own exchange rate or fees.</p>
        </div>
        <div data-public-pricing-card-grid className="mx-auto mt-12 grid w-full max-w-[1180px] grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
          {couplePlans.map(({ key, icon: Icon, popular }) => {
            const details = PUBLIC_COUPLE_PLAN_DETAILS[key];
            const price = displayCouplePrice(AUD_BASE_PRICES[key]);
            return (
              <article key={key} aria-labelledby={`${key}-plan-title`} className={`relative flex h-full flex-col rounded-[20px] bg-white p-7 shadow-[0_6px_30px_rgba(43,23,17,.10)] ${popular ? 'border-2 border-[#70452f]' : 'border border-[#e7d8c7]'}`}>
                {popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="ww-pricing-button-green inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white"><Gem size={14} strokeWidth={1.8} aria-hidden="true" />Most Popular</span></div>}
                <div className={`flex items-center gap-2 ${popular ? 'mt-2' : ''}`}>
                  {key === 'essential' ? (
                    <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center" aria-hidden="true">
                      <Heart size={22} strokeWidth={1.8} className="text-[#5b3425]" />
                      <Sparkles size={9} strokeWidth={1.8} className="absolute -right-1 -top-1 text-[#5b3425]" />
                    </span>
                  ) : key === 'unlimited' ? (
                    <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
                      <Wine size={20} strokeWidth={1.8} className="absolute left-0 top-0.5 -rotate-12 text-[#5b3425]" />
                      <Wine size={20} strokeWidth={1.8} className="absolute right-0 top-0.5 rotate-12 text-[#5b3425]" />
                    </span>
                  ) : (
                    <Icon size={22} strokeWidth={1.8} aria-hidden="true" className="text-[#5b3425]" />
                  )}
                  <h3 id={`${key}-plan-title`} className="text-4xl font-bold text-[#412419]">{details.name}</h3>
                </div>
                <p className="mt-5 text-2xl font-bold text-[#221b18]" aria-label={`${details.name}, ${price} Australian dollars one-time`}>{price}</p>
                <div className="mt-3 leading-6">
                  <p className="font-semibold text-[#412419]">Up to {details.guests} guests</p>
                  <p className="text-sm text-[#6f625b]">One event for 12 months</p>
                  <p className="text-sm text-[#6f625b]">Additional events available to purchase</p>
                  <p className="text-sm text-[#6f625b]">Account recovery: 6 months after access ends.</p>
                  <p className="text-sm text-[#6f625b]">Complete platform access</p>
                  <p className="text-sm text-[#6f625b]">Up to 5,000 images and 100 videos per event. Videos up to 5 minutes and 600 MB each. Includes 10 GB shared media storage; storage may fill before these counts.</p>
                </div>
                <PlanFeatureList communicationCredits={details.communicationCredits} />
                <div className="mt-auto pt-7">
                  <Cta plan={key} name={details.name} currency={effectiveCurrency} green={popular} />
                  <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs text-[#8d7c72]">
                    <span>7 days free trial included</span>
                    <Heart size={11} strokeWidth={2} aria-hidden="true" className="text-[#412419]" />
                    <strong className="font-bold text-[#412419]">No credit card required</strong>
                  </p>
                </div>
              </article>
            );
          })}

        </div>
        <p className="mt-10 text-center text-base font-medium text-[#412419]">Start with the free trial, then choose the capacity your event needs.</p>
      </div>
    </section>
  );
};
