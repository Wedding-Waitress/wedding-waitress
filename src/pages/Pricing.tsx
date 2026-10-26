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
        <section className="ww-section ww-section-cream"><div className="ww-container max-w-5xl"><h2 className="ww-title text-center">Plan details, without surprises</h2><div className="mt-9 grid gap-5 md:grid-cols-3"><article className="ww-card p-6"><h3 className="text-lg font-semibold">Guest capacity</h3><p className="mt-3 leading-7 text-[#6f625b]">The capacity is the maximum number of guests for your event. If your list grows beyond it, choose an available higher-capacity plan before continuing.</p></article><article className="ww-card p-6"><h3 className="text-lg font-semibold">Renewal</h3><p className="mt-3 leading-7 text-[#6f625b]">Renewal requires choosing an available package and completing checkout. Signing in or visiting a payment-success page does not charge you or renew your access.</p></article><article className="ww-card p-6"><h3 className="text-lg font-semibold">After 12 months</h3><p className="mt-3 leading-7 text-[#6f625b]">Planning and download access ends when the paid period expires. Your saved information remains retained. Expiry alone does not automatically delete your account or content; paid access resumes only after a successful, verified renewal.</p></article></div></div></section>
      </main>
      <PublicFooter />
    </div>
  );
};
