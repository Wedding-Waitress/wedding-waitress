/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-qr-code-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeaturePlanning = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.planning.title')}
      description={t('fp.planning.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.planning.pageTitle')}
      metaDescription={t('fp.planning.metaDesc')}
      seoSections={[
        { heading: t('fp.planning.seo1Heading'), text: <Trans i18nKey="fp.planning.seo1Text" ns="landing" components={[<Link to="/tables" className={linkClass} />]} /> },
        { heading: t('fp.planning.seo2Heading'), text: <Trans i18nKey="fp.planning.seo2Text" ns="landing" components={[<Link to="/qr-code-seating-chart" className={linkClass} />]} /> },
        { heading: t('fp.planning.seo3Heading'), text: <Trans i18nKey="fp.planning.seo3Text" ns="landing" components={[<Link to="/kiosk-live-view" className={linkClass} />]} /> },
      ]}
      relatedFeatures={[
        { label: t('fp.planning.related1'), href: "/tables" },
        { label: t('fp.planning.related2'), href: "/qr-code-seating-chart" },
        { label: t('fp.planning.related3'), href: "/kiosk-live-view" },
      ]}
    />
  );
};