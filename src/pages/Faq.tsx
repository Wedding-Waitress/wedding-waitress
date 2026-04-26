import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';

export const Faq: React.FC = () => {
  const { t } = useTranslation('landing');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqItems = t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;

  const faqJsonLd = Array.isArray(faqItems) ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  } : undefined;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SeoHead
        title="Frequently Asked Questions | Wedding Waitress"
        description="Answers to common questions about Wedding Waitress: pricing, guest list, seating charts, QR codes, RSVPs, and more."
        jsonLd={faqJsonLd}
      />
      <Header />
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('faq.title')}
          </h1>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-xl mx-auto">
            {t('faq.subtitle')}
          </p>
          <div className="space-y-4">
            {Array.isArray(faqItems) && faqItems.map((item, i) => (
              <div
                key={i}
                className="bg-[#FAFAFA] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_4px_30px_rgba(0,0,0,0.06)]"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-base font-semibold text-gray-900 pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-[500px] pb-6' : 'max-h-0'}`}>
                  <p className="px-6 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
};
