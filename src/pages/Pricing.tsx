import React from 'react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { PricingSection } from '@/components/Pricing/PricingSection';
import { PricingValueComparison } from '@/components/Pricing/PricingValueComparison';
import '@/styles/PublicSite.css';
import '@/components/Pricing/PricingCoffeePolish.css';
import { PACKAGE_PRICES_AUD, gstInclusiveAud } from '@/lib/packagePricing';
import { usePublicCopy } from '@/i18n/usePublicCopy';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';

export const Pricing: React.FC = () => {
  const copy = usePublicCopy();
  const pricingSchema = {
    '@context': 'https://schema.org', '@type': 'Product', name: 'Wedding Waitress',
    description: 'All-in-one wedding planning and guest-experience platform.',
    offers: [
      { '@type': 'Offer', name: 'Essential', price: gstInclusiveAud(PACKAGE_PRICES_AUD.essential).toFixed(2), priceCurrency: 'AUD', description: copy('Includes 10% GST worldwide.') },
      { '@type': 'Offer', name: 'Premium', price: gstInclusiveAud(PACKAGE_PRICES_AUD.premium).toFixed(2), priceCurrency: 'AUD', description: copy('Includes 10% GST worldwide.') },
      { '@type': 'Offer', name: 'Ultimate', price: gstInclusiveAud(PACKAGE_PRICES_AUD.unlimited).toFixed(2), priceCurrency: 'AUD', description: copy('Includes 10% GST worldwide.') },
    ],
  };
  return (
    <div className="ww-public ww-pricing-page min-h-screen bg-[#fffdf9]">
      <SeoHead
        title="Pricing Plans | Wedding Waitress"
        description={copy('Wedding Waitress plans start at AUD $218.90 including 10% GST, with one event and 12 months of access.')}
        canonicalPath="/pricing"
        jsonLd={pricingSchema}
      />
      <Header />
      <main>
        <PublicPageHero compact asset={publicHeroForRoute('/pricing')} eyebrow="Pricing" title="Choose by guest capacity, not by features" description="Everything you need to plan your wedding and event with confidence, all in one place." />
        <PricingSection />
        <PricingValueComparison />

      </main>
      <PublicFooter />
    </div>
  );
};
