import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { EmbeddedSignUpForm } from '@/components/auth/EmbeddedSignUpForm';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { useTranslation } from 'react-i18next';

interface SeoSection {
  heading: string;
  text: React.ReactNode;
}

interface InternalLink {
  label: string;
  href: string;
}

interface FeaturePageLayoutProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  pageTitle?: string;
  metaDescription?: string;
  seoSections?: SeoSection[];
  relatedFeatures?: InternalLink[];
}

export const FeaturePageLayout: React.FC<FeaturePageLayoutProps> = ({ title, description, backgroundImage, pageTitle, metaDescription, seoSections, relatedFeatures }) => {
  const location = useLocation();
  const { t } = useTranslation('landing');

  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle;
    }
    const metaTag = document.querySelector('meta[name="description"]');
    if (metaDescription && metaTag) {
      metaTag.setAttribute('content', metaDescription);
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://weddingwaitress.com${location.pathname}`);

    return () => {
      document.title = 'Wedding Planning App Australia | Guest List, Seating Chart & RSVP Tool';
      if (metaTag) {
        metaTag.setAttribute('content', 'Plan your wedding with ease using Wedding Waitress — the all-in-one wedding planning app. Manage your guest list, create seating charts, send QR code RSVPs, and organise your entire event in one place.');
      }
      if (canonical) {
        canonical.setAttribute('href', 'https://weddingwaitress.com/');
      }
    };
  }, [pageTitle, metaDescription, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5]">
      <Header />

      <main className="flex-1 flex flex-col">
        <section className="w-full bg-[#f3efe9] pt-20 pb-20">
          <div className="flex flex-col md:flex-row max-w-[1400px] mx-auto">
            <div
              className="relative w-full md:w-1/2 min-h-[340px] md:min-h-[500px] flex items-center justify-center"
              style={{
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: backgroundImage ? undefined : '#967A59',
              }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <Link
                to="/"
                onClick={() => window.scrollTo(0, 0)}
                className="absolute top-4 left-6 z-20 text-sm text-white hover:text-[#967A59] transition-colors"
              >
                {t('fp.backToHome')}
              </Link>
              <div className="relative z-10 text-center px-8 py-16 md:py-0 max-w-lg">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                  {title}
                </h1>
                {description && (
                  <p className="mt-5 text-base sm:text-lg text-white/90 leading-relaxed drop-shadow-md">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12 md:py-0">
              <EmbeddedSignUpForm />
            </div>
          </div>
        </section>

        {seoSections && seoSections.length > 0 && (
          <section className="w-full max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-10">
            {seoSections.map((section, i) => (
              <div key={i}>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] mb-3">
                  {section.heading}
                </h2>
                <p className="text-base text-[#6E6E73] leading-relaxed">
                  {section.text}
                </p>
              </div>
            ))}

            <p className="text-sm text-[#6E6E73] text-center pt-4">
              {t('fp.trustSignal')}
            </p>
          </section>
        )}

        {relatedFeatures && relatedFeatures.length > 0 && (
          <section className="w-full max-w-4xl mx-auto px-6 pb-12 md:pb-16">
            <h2 className="text-lg font-semibold text-[#1D1D1F] mb-4">{t('fp.exploreMore')}</h2>
            <div className="flex flex-wrap gap-3">
              {relatedFeatures.map((link, i) => (
                <Link
                  key={i}
                  to={link.href}
                  onClick={() => window.scrollTo(0, 0)}
                  className="text-sm font-medium text-[#967A59] hover:text-[#7a6347] underline underline-offset-2 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        {t('fp.footerCopy', { year: new Date().getFullYear() })}
      </footer>
      <CookieBanner />
    </div>
  );
};