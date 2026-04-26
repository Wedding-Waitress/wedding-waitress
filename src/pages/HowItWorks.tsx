import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, UserPlus, Palette, Share2, ArrowRight } from 'lucide-react';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { Button } from '@/components/ui/enhanced-button';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';

export const HowItWorks: React.FC = () => {
  const { t } = useTranslation('landing');
  const steps = [
    { icon: CalendarPlus, step: '1', titleKey: 'step1Title', descKey: 'step1Desc' },
    { icon: UserPlus, step: '2', titleKey: 'step2Title', descKey: 'step2Desc' },
    { icon: Palette, step: '3', titleKey: 'step3Title', descKey: 'step3Desc' },
    { icon: Share2, step: '4', titleKey: 'step4Title', descKey: 'step4Desc' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SeoHead
        title="How Wedding Waitress Works | 4 Simple Steps"
        description="Learn how Wedding Waitress helps you plan your wedding in four simple steps: create your event, add your guests, customise, and share with QR codes."
      />
      <Header />
      <section className="py-20 md:py-28 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4">
            {t('howItWorks.title')}
          </h1>
          <p className="text-lg text-gray-500 text-center mb-16 max-w-4xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center group">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: 'rgba(150, 122, 89, 0.1)' }}>
                  <item.icon className="w-8 h-8" style={{ color: '#967A59' }} />
                </div>
                <div className="text-sm font-bold mb-2" style={{ color: '#967A59' }}>{t('howItWorks.stepLabel')} {item.step}</div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t(`howItWorks.${item.titleKey}`)}</h2>
                <p className="text-gray-500 text-sm leading-relaxed">{t(`howItWorks.${item.descKey}`)}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mt-12" style={{ color: '#967A59' }}>{t('howItWorks.bottomNote')}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-8 py-5 text-base font-semibold">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </AuthGatedCtaLink>
            <Link to="/features">
              <Button size="lg" variant="outline" className="rounded-2xl px-8 py-5 text-base font-semibold">
                Explore Features
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
};
