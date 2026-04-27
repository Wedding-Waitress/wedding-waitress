/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-tables-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureQrSeating = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.qrSeating.title')}
      description={t('fp.qrSeating.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.qrSeating.pageTitle')}
      metaDescription={t('fp.qrSeating.metaDesc')}
      seoSections={[
        { heading: t('fp.qrSeating.seo1Heading'), text: <Trans i18nKey="fp.qrSeating.seo1Text" ns="landing" components={[<Link to="/tables" className={linkClass} />]} /> },
        { heading: t('fp.qrSeating.seo2Heading'), text: <Trans i18nKey="fp.qrSeating.seo2Text" ns="landing" components={[<Link to="/running-sheet-product" className={linkClass} />]} /> },
        { heading: t('fp.qrSeating.seo3Heading'), text: <Trans i18nKey="fp.qrSeating.seo3Text" ns="landing" components={[<Link to="/floor-plan" className={linkClass} />]} /> },
      ]}
      relatedFeatures={[
        { label: t('fp.qrSeating.related1'), href: "/tables" },
        { label: t('fp.qrSeating.related2'), href: "/running-sheet-product" },
        { label: t('fp.qrSeating.related3'), href: "/floor-plan" },
      ]}
    />
  );
};