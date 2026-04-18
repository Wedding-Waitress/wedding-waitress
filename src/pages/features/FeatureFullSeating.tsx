/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-full-seating-chart-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureFullSeating = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.fullSeating.title')}
      description={t('fp.fullSeating.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.fullSeating.pageTitle')}
      metaDescription={t('fp.fullSeating.metaDesc')}
      seoSections={[
        { heading: t('fp.fullSeating.seo1Heading'), text: <Trans i18nKey="fp.fullSeating.seo1Text" ns="landing" components={[<Link to="/features/table-charts" className={linkClass} />]} /> },
        { heading: t('fp.fullSeating.seo2Heading'), text: <Trans i18nKey="fp.fullSeating.seo2Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.fullSeating.seo3Heading'), text: t('fp.fullSeating.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.fullSeating.related1'), href: "/features/table-charts" },
        { label: t('fp.fullSeating.related2'), href: "/features/seating" },
        { label: t('fp.fullSeating.related3'), href: "/features/qr-seating" },
      ]}
    />
  );
};