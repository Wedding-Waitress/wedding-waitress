import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enLanding from './locales/en/landing.json';
import enGallery from './locales/en/gallery.json';
import enDashboard from './locales/en/dashboard.json';

import deCommon from './locales/de/common.json';
import deLanding from './locales/de/landing.json';
import deGallery from './locales/de/gallery.json';
import deDashboard from './locales/de/dashboard.json';

import esCommon from './locales/es/common.json';
import esLanding from './locales/es/landing.json';
import esGallery from './locales/es/gallery.json';
import esDashboard from './locales/es/dashboard.json';

import frCommon from './locales/fr/common.json';
import frLanding from './locales/fr/landing.json';
import frGallery from './locales/fr/gallery.json';
import frDashboard from './locales/fr/dashboard.json';

import itCommon from './locales/it/common.json';
import itLanding from './locales/it/landing.json';
import itGallery from './locales/it/gallery.json';
import itDashboard from './locales/it/dashboard.json';

import nlCommon from './locales/nl/common.json';
import nlLanding from './locales/nl/landing.json';
import nlGallery from './locales/nl/gallery.json';
import nlDashboard from './locales/nl/dashboard.json';

import jaCommon from './locales/ja/common.json';
import jaLanding from './locales/ja/landing.json';
import jaGallery from './locales/ja/gallery.json';
import jaDashboard from './locales/ja/dashboard.json';

import arCommon from './locales/ar/common.json';
import arLanding from './locales/ar/landing.json';
import arGallery from './locales/ar/gallery.json';
import arDashboard from './locales/ar/dashboard.json';

import viCommon from './locales/vi/common.json';
import viLanding from './locales/vi/landing.json';
import viGallery from './locales/vi/gallery.json';
import viDashboard from './locales/vi/dashboard.json';

import zhCommon from './locales/zh/common.json';
import zhLanding from './locales/zh/landing.json';
import zhGallery from './locales/zh/gallery.json';
import zhDashboard from './locales/zh/dashboard.json';

import trCommon from './locales/tr/common.json';
import trLanding from './locales/tr/landing.json';
import trGallery from './locales/tr/gallery.json';
import trDashboard from './locales/tr/dashboard.json';

import elCommon from './locales/el/common.json';
import elLanding from './locales/el/landing.json';
import elGallery from './locales/el/gallery.json';
import elDashboard from './locales/el/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    gallery: enGallery,
    dashboard: enDashboard,
  },
  de: {
    common: deCommon,
    landing: deLanding,
    gallery: deGallery,
    dashboard: deDashboard,
  },
  es: {
    common: esCommon,
    landing: esLanding,
    gallery: esGallery,
    dashboard: esDashboard,
  },
  fr: {
    common: frCommon,
    landing: frLanding,
    gallery: frGallery,
    dashboard: frDashboard,
  },
  it: {
    common: itCommon,
    landing: itLanding,
    gallery: itGallery,
    dashboard: itDashboard,
  },
  nl: {
    common: nlCommon,
    landing: nlLanding,
    gallery: nlGallery,
    dashboard: nlDashboard,
  },
  ja: {
    common: jaCommon,
    landing: jaLanding,
    gallery: jaGallery,
    dashboard: jaDashboard,
  },
  ar: {
    common: arCommon,
    landing: arLanding,
    gallery: arGallery,
    dashboard: arDashboard,
  },
  vi: {
    common: viCommon,
    landing: viLanding,
    gallery: viGallery,
    dashboard: viDashboard,
  },
  zh: {
    common: zhCommon,
    landing: zhLanding,
    gallery: zhGallery,
    dashboard: zhDashboard,
  },
  tr: {
    common: trCommon,
    landing: trLanding,
    gallery: trGallery,
    dashboard: trDashboard,
  },
  el: {
    common: elCommon,
    landing: elLanding,
    gallery: elGallery,
    dashboard: elDashboard,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Update HTML lang and dir attributes
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
});

export default i18n;
