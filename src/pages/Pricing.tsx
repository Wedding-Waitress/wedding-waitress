import React from 'react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { PricingSection } from '@/components/Pricing/PricingSection';

export const Pricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SeoHead
        title="Pricing Plans | Wedding Waitress"
        description="Simple, transparent pricing for Wedding Waitress. Choose Essential, Premium, or Unlimited one-time plans, or a vendor monthly subscription."
      />
      <Header />
      <main className="pt-8">
        <h1 className="sr-only">Wedding Waitress Pricing Plans</h1>
        <PricingSection />
      </main>
      <PublicFooter />
    </div>
  );
};
