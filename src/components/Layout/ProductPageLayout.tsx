import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { Header } from '@/components/Layout/Header';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { SeoHead } from '@/components/SEO/SeoHead';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';

const PRODUCT_LINKS: { href: string; key: string }[] = [
  { href: '/products/my-events', key: 'myEvents' },
  { href: '/products/guest-list', key: 'guestList' },
  { href: '/products/tables', key: 'tables' },
  { href: '/products/qr-code-seating-chart', key: 'qrSeating' },
  { href: '/products/invitations-cards', key: 'invitationsCards' },
  { href: '/products/name-place-cards', key: 'placeCards' },
  { href: '/products/individual-table-charts', key: 'tableCharts' },
  { href: '/products/floor-plan', key: 'floorPlan' },
  { href: '/products/dietary-requirements', key: 'dietary' },
  { href: '/products/full-seating-chart', key: 'fullSeating' },
  { href: '/products/kiosk-live-view', key: 'kioskLiveView' },
  { href: '/products/dj-mc-questionnaire', key: 'djMc' },
  { href: '/products/running-sheet', key: 'runningSheet' },
];

export interface ProductFeatureHighlight {
  heading: string;
  text?: string;
}

export interface ProductPageLayoutProps {
  pageTitle: string;
  metaDescription: string;
  h1: string;
  lead: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  highlights: ProductFeatureHighlight[];
  finalCtaHeading?: string;
  finalCtaText?: string;
  finalCtaLabel?: string;
  finalCtaHref?: string;
  breadcrumbLabel: string;
}

export const ProductPageLayout: React.FC<ProductPageLayoutProps> = ({
  pageTitle,
  metaDescription,
  h1,
  lead,
  primaryCta,
  secondaryCta,
  highlights,
  finalCtaHeading,
  finalCtaText,
  finalCtaLabel,
  finalCtaHref = '/dashboard',
  breadcrumbLabel,
}) => {
  const location = useLocation();
  const { t } = useTranslation('landing');
  const url = `https://weddingwaitress.com${location.pathname}`;

  const resolvedPrimaryCta = primaryCta ?? {
    label: t('productPage.startPlanningEvent', { defaultValue: 'Start Planning Your Event' }),
    href: '/dashboard',
  };
  const resolvedFinalCtaHeading = finalCtaHeading ?? t('productPage.finalDefaultHeading');
  const resolvedFinalCtaText = finalCtaText ?? t('productPage.finalDefaultText');
  const resolvedFinalCtaLabel =
    finalCtaLabel ?? t('productPage.startPlanningEvent', { defaultValue: 'Start Planning Your Event' });

  const isDashboardHref = (href?: string) => {
    if (!href) return false;
    const h = href.trim().toLowerCase();
    return h === '/dashboard' || h.startsWith('/dashboard/') || h.startsWith('/dashboard?');
  };

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
              {isDashboardHref(resolvedPrimaryCta.href) ? (
                <AuthGatedCtaLink
                  to={resolvedPrimaryCta.href}
                  alwaysSignUp
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#967A59] text-white font-semibold text-base hover:bg-[#7a6347] transition-colors shadow-sm"
                >
                  {resolvedPrimaryCta.label}
                </AuthGatedCtaLink>
              ) : (
                <Link
                  to={resolvedPrimaryCta.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-[#967A59] text-white font-semibold text-base hover:bg-[#7a6347] transition-colors shadow-sm"
                >
                  {resolvedPrimaryCta.label}
                </Link>
              )}
              {secondaryCta && (
                secondaryCta.href && isDashboardHref(secondaryCta.href) ? (
                  <AuthGatedCtaLink
                    to={secondaryCta.href}
                    alwaysSignUp
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
              {t('productPage.exploreMore')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRODUCT_LINKS.filter((p) => p.href !== location.pathname).map((p) => (
                <Link
                  key={p.href}
                  to={p.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="block bg-[#faf8f5] rounded-2xl p-6 border border-[#eee5d8] hover:border-[#967A59] hover:shadow-md transition-all"
                >
                  <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">
                    {t(`explore.cards.${p.key}.heading`)}
                  </h3>
                  <p className="text-sm text-[#6E6E73] leading-relaxed">
                    {t(`explore.cards.${p.key}.text`)}
                  </p>
                  <span className="mt-3 inline-block text-sm font-semibold text-[#967A59]">
                    {t('explore.learnMore')}
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
              {resolvedFinalCtaHeading}
            </h2>
            <p className="text-lg text-white/90 mb-8 leading-relaxed">{resolvedFinalCtaText}</p>
            {isDashboardHref(finalCtaHref) ? (
              <AuthGatedCtaLink
                to={finalCtaHref}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
              >
                {resolvedFinalCtaLabel}
              </AuthGatedCtaLink>
            ) : (
              <Link
                to={finalCtaHref}
                onClick={() => window.scrollTo(0, 0)}
                className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#967A59] font-semibold text-base hover:bg-[#faf8f5] transition-colors shadow-sm"
              >
                {resolvedFinalCtaLabel}
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* Footer mirrors Landing.tsx footer for consistency */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" className="h-10 w-auto brightness-0 invert" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                {t('footer.tagline')}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.explore')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.features')}</Link></li>
                  <li><Link to="/#pricing" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.pricing')}</Link></li>
                  <li><Link to="/#faq" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.faq')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.support')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/contact" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.contactUs')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.legal')}</h4>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                  <li><Link to="/terms" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
                  <li><Link to="/cookies" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">{t('footer.cookiePolicy')}</Link></li>
                </ul>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.followUs')}</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex items-center justify-center">
            <p className="text-gray-500 text-sm">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </div>
  );
};
