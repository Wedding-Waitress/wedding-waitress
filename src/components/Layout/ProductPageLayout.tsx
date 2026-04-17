import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SeoHead } from '@/components/SEO/SeoHead';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';

const ALL_PRODUCTS = [
  { href: '/products/my-events', heading: 'My Events', text: 'Manage all your weddings and events from one dashboard.' },
  { href: '/products/guest-list', heading: 'Guest List', text: 'Track RSVPs and organise guests in seconds.' },
  { href: '/products/tables', heading: 'Tables', text: 'Create tables, set guest limits, and plan your layout.' },
  { href: '/products/qr-code-seating-chart', heading: 'QR Code Seating Chart', text: 'Let guests scan and find their seat instantly.' },
  { href: '/products/invitations-cards', heading: 'Invitations & Cards', text: 'Send beautiful digital invites via SMS or email.' },
  { href: '/products/name-place-cards', heading: 'Name Place Cards', text: 'Clean, elegant place cards for organised seating.' },
];

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
              {primaryCta.href === '/dashboard' ? (
                <AuthGatedCtaLink
                  to={primaryCta.href}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#967A59] text-white font-semibold text-base hover:bg-[#7a6347] transition-colors shadow-sm"
                >
                  {primaryCta.label}
                </AuthGatedCtaLink>
              ) : (
                <Link
                  to={primaryCta.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#967A59] text-white font-semibold text-base hover:bg-[#7a6347] transition-colors shadow-sm"
                >
                  {primaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                secondaryCta.href === '/dashboard' ? (
                  <AuthGatedCtaLink
                    to={secondaryCta.href}
                    className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-[#967A59] text-[#967A59] font-semibold text-base hover:bg-[#967A59] hover:text-white transition-colors"
                  >
                    {secondaryCta.label}
                  </AuthGatedCtaLink>
                ) : (
                  <Link
                    to={secondaryCta.href}
                    onClick={() => window.scrollTo(0, 0)}
                    className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-[#967A59] text-[#967A59] font-semibold text-base hover:bg-[#967A59] hover:text-white transition-colors"
                  >
                    {secondaryCta.label}
                  </Link>
                )
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

        {/* Explore More Features — internal linking for SEO */}
        <section className="w-full bg-white border-t border-[#eee5d8] py-16 md:py-20">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1D1D1F] text-center mb-10">
              Explore More Features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_PRODUCTS.filter((p) => p.href !== location.pathname).map((p) => (
                <Link
                  key={p.href}
                  to={p.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="block bg-[#faf8f5] rounded-2xl p-6 border border-[#eee5d8] hover:border-[#967A59] hover:shadow-md transition-all"
                >
                  <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">{p.heading}</h3>
                  <p className="text-sm text-[#6E6E73] leading-relaxed">{p.text}</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-[#967A59]">
                    Learn more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full bg-[#967A59] py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {finalCtaHeading}
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">{finalCtaText}</p>
            {finalCtaHref === '/dashboard' ? (
              <AuthGatedCtaLink
                to={finalCtaHref}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
              >
                {finalCtaLabel}
              </AuthGatedCtaLink>
            ) : (
              <Link
                to={finalCtaHref}
                onClick={() => window.scrollTo(0, 0)}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
              >
                {finalCtaLabel}
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-[#1D1D1F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-lg font-bold mb-4">Wedding Waitress</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              All-in-one wedding and event planning made simple.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/90">Features</h3>
            <ul className="space-y-2">
              {ALL_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <Link
                    to={p.href}
                    onClick={() => window.scrollTo(0, 0)}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {p.heading}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 text-white/90">Get Started</h3>
            <ul className="space-y-2">
              <li><AuthGatedCtaLink to="/dashboard" className="text-sm text-white/70 hover:text-white">Start Planning</AuthGatedCtaLink></li>
              <li><Link to="/" onClick={() => window.scrollTo(0, 0)} className="text-sm text-white/70 hover:text-white">Home</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Wedding Waitress. All rights reserved.
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
};
