import React, { useEffect } from 'react';
import { createInstance } from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import publicI18n from './config';
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';
import enDashboard from './locales/en/dashboard.json';
import { isPublicLanguageRoute } from './publicLanguageRoutes';

// No detector, persistence or initReactI18next plugin here. Visiting a dashboard
// never overwrites the visitor's independently remembered public language.
export const dashboardEnglishI18n = createInstance();
void dashboardEnglishI18n.init({
  lng: 'en', fallbackLng: 'en', initImmediate: false, defaultNS: 'common',
  resources: { en: { common: enCommon, landing: enLanding, dashboard: enDashboard } },
  interpolation: { escapeValue: false },
});

export function PublicLanguageBoundary({ children }: React.PropsWithChildren) {
  const { pathname } = useLocation();
  const { i18n } = useTranslation('common', { i18n: publicI18n });
  const publicRoute = isPublicLanguageRoute(pathname);
  const language = publicRoute ? (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0] : 'en';
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language, pathname]);
  return <I18nextProvider i18n={publicRoute ? publicI18n : dashboardEnglishI18n}>{children}</I18nextProvider>;
}
