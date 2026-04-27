/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-kiosk-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureKiosk = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.kiosk.title')}
      description={t('fp.kiosk.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.kiosk.pageTitle')}
      metaDescription={t('fp.kiosk.metaDesc')}
      seoSections={[
        { heading: t('fp.kiosk.seo1Heading'), text: <Trans i18nKey="fp.kiosk.seo1Text" ns="landing" components={[<Link to="/running-sheet-product" className={linkClass} />]} /> },
        { heading: t('fp.kiosk.seo2Heading'), text: <Trans i18nKey="fp.kiosk.seo2Text" ns="landing" components={[<Link to="/tables" className={linkClass} />]} /> },
        { heading: t('fp.kiosk.seo3Heading'), text: t('fp.kiosk.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.kiosk.related1'), href: "/running-sheet-product" },
        { label: t('fp.kiosk.related2'), href: "/tables" },
        { label: t('fp.kiosk.related3'), href: "/qr-code-seating-chart" },
      ]}
    />
  );
};