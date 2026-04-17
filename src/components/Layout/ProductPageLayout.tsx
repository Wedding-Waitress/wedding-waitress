import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SeoHead } from '@/components/SEO/SeoHead';

export interface ProductFeatureHighlight {
  heading: string;
  text?: string;
}

export interface ProductPageLayoutProps {
  /** SEO <title>. */
  pageTitle: string;
  /** SEO meta description. */
  metaDescription: string;
  /** Visible H1 on the page. */
  h1: string;
  /** Lead paragraph below the H1. */
  lead: string;
  /** Primary CTA. Defaults to /dashboard. */
  primaryCta?: { label: string; href: string };
  /** Optional secondary CTA. */
  secondaryCta?: { label: string; href: string };
  /** Feature highlight H2 sections. */
  highlights: ProductFeatureHighlight[];
  /** Final CTA section text. */
  finalCtaHeading?: string;
  finalCtaText?: string;
  finalCtaLabel?: string;
  finalCtaHref?: string;
  /** Breadcrumb label for this page (e.g. "My Events"). Used in JSON-LD. */
  breadcrumbLabel: string;
}

/**
 * Reusable shell for every public /products/* SEO landing page.
 * Indexable (no noIndex). Includes WebPage + BreadcrumbList JSON-LD.
 */
export const ProductPageLayout: React.FC<ProductPageLayoutProps> = ({
  pageTitle,
  metaDescription,
  h1,
  lead,
  primaryCta = { label: 'Start Planning Your Event', href: '/dashboard' },
  secondaryCta,
  highlights,
  finalCtaHeading = 'Ready to get started?',
  finalCtaText = 'Join thousands of couples planning their big day with Wedding Waitress.',
  finalCtaLabel = 'Start Planning Your Event',
  finalCtaHref = '/dashboard',
  breadcrumbLabel,
}) => {
  const location = useLocation();
  const url = `https://weddingwaitress.com${location.pathname}`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://weddingwaitress.com/' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://weddingwaitress.com/products' },
      { '@type': 'ListItem', position: 3, name: breadcrumbLabel, item: url },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: metaDescription,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Wedding Waitress',
      url: 'https://weddingwaitress.com',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <SeoHead
        title={pageTitle}
        description={metaDescription}
        jsonLd={[breadcrumbJsonLd, webPageJsonLd]}
      />
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="w-full bg-[#f3efe9] pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1D1D1F] leading-tight">
              {h1}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-[#6E6E73] leading-relaxed max-w-2xl mx-auto">
              {lead}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={primaryCta.href}
                onClick={() => window.scrollTo(0, 0)}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#967A59] text-white font-semibold text-base hover:bg-[#7a6347] transition-colors shadow-sm"
              >
                {primaryCta.label}
              </Link>
              {secondaryCta && (
                <Link
                  to={secondaryCta.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-[#967A59] text-[#967A59] font-semibold text-base hover:bg-[#967A59] hover:text-white transition-colors"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-[#eee5d8] shadow-sm"
              >
                <h2 className="text-xl md:text-2xl font-bold text-[#1D1D1F] mb-3">
                  {h.heading}
                </h2>
                {h.text && (
                  <p className="text-base text-[#6E6E73] leading-relaxed">{h.text}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full bg-[#967A59] py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {finalCtaHeading}
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">{finalCtaText}</p>
            <Link
              to={finalCtaHref}
              onClick={() => window.scrollTo(0, 0)}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
            >
              {finalCtaLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Wedding Waitress. All rights reserved.
      </footer>
      <CookieBanner />
    </div>
  );
};
