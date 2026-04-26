/**
 * Shared public footer — extracted from locked Landing footer.
 * Visual markup identical to Landing.tsx footer; only difference is that
 * "Features / Pricing / FAQ" links point to real routes instead of in-page anchors.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Instagram, Facebook, Youtube } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { t } = useTranslation('landing');
  return (
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:gap-8 lg:gap-12">
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.explore')}</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li><Link to="/features" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.features')}</Link></li>
                <li><Link to="/pricing" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.pricing')}</Link></li>
                <li><Link to="/faq" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.faq')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.support')}</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li><Link to="/contact" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.contactUs')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-300">{t('footer.legal')}</h4>
              <ul className="space-y-1 text-sm text-gray-400">
                <li><Link to="/privacy" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.terms')}</Link></li>
                <li><Link to="/cookies" className="block py-1.5 hover:text-white transition-colors whitespace-nowrap">{t('footer.cookiePolicy')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="md:pl-8 lg:pl-16">
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
  );
};
