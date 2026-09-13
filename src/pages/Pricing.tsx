import React from 'react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { PricingSection } from '@/components/Pricing/PricingSection';
import { PricingValueComparison } from '@/components/Pricing/PricingValueComparison';
import '@/styles/PublicSite.css';
import { PACKAGE_PRICES_AUD } from '@/lib/packagePricing';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';

export const Pricing: React.FC = () => {
  const pricingSchema = {
    '@context': 'https://schema.org', '@type': 'Product', name: 'Wedding Waitress',
    description: 'All-in-one wedding planning and guest-experience platform.',
    offers: [
      { '@type': 'Offer', name: 'Essential', price: String(PACKAGE_PRICES_AUD.essential), priceCurrency: 'AUD', description: 'One-time payment for one event, 12 months, up to 100 guests; price excludes GST.' },
      { '@type': 'Offer', name: 'Premium', price: String(PACKAGE_PRICES_AUD.premium), priceCurrency: 'AUD', description: 'One-time payment for one event, 12 months, up to 200 guests; price excludes GST.' },
      { '@type': 'Offer', name: 'Ultimate', price: String(PACKAGE_PRICES_AUD.unlimited), priceCurrency: 'AUD', description: 'One-time payment for one event, 12 months, up to 400 guests, with 450 Email & SMS credits; price excludes GST.' },
    ],
  };
  return (
    <div className="ww-public ww-pricing-page min-h-screen bg-[#fffdf9]">
      <SeoHead
        title="Pricing Plans | Wedding Waitress"
        description="Wedding Waitress couple plans start at AUD $199 one-time for one event, 12 months and complete platform access. Advertised prices exclude GST."
        canonicalPath="/pricing"
        jsonLd={pricingSchema}
      />
      <Header />
      <main>
        <PublicPageHero compact asset={publicHeroForRoute('/pricing')} eyebrow="Pricing" title="Choose by guest capacity, not by features" description="Everything you need to plan your wedding and event with confidence, all in one place." />
        <PricingSection />
        <PricingValueComparison />
        <section className="ww-section ww-section-cream"><div className="ww-container max-w-5xl"><h2 className="ww-title text-center">Plan details, without surprises</h2><div className="mt-9 grid gap-5 md:grid-cols-3"><article className="ww-card p-6"><h3 className="text-lg font-semibold">Guest capacity</h3><p className="mt-3 leading-7 text-[#6f625b]">The capacity is the maximum number of guests for your event. If your list grows beyond it, choose an available higher-capacity plan before continuing.</p></article><article className="ww-card p-6"><h3 className="text-lg font-semibold">Extensions</h3><p className="mt-3 leading-7 text-[#6f625b]">Extend for one month or any number of whole months at A$20 per month, paid upfront. An active plan extends from its current expiry; recovery-period access restarts from payment.</p></article><article className="ww-card p-6"><h3 className="text-lg font-semibold">After 12 months</h3><p className="mt-3 leading-7 text-[#6f625b]">Planning and download access ends when the paid period expires. Your saved account, including photos and videos, remains recoverable for six calendar months. If you do not extend by the recovery deadline, the account and recoverable content are permanently removed from Wedding Waitress; legally required financial records and provider backup retention may follow separate requirements.</p></article></div></div></section>
      </main>
      <PublicFooter />
    </div>
  );
};
