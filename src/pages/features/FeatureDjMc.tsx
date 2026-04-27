/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dj-mc-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureDjMc = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.djMc.title')}
      description={t('fp.djMc.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.djMc.pageTitle')}
      metaDescription={t('fp.djMc.metaDesc')}
      seoSections={[
        { heading: t('fp.djMc.seo1Heading'), text: <Trans i18nKey="fp.djMc.seo1Text" ns="landing" components={[<Link to="/guest-list" className={linkClass} />]} /> },
        { heading: t('fp.djMc.seo2Heading'), text: t('fp.djMc.seo2Text') },
        { heading: t('fp.djMc.seo3Heading'), text: t('fp.djMc.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.djMc.related1'), href: "/guest-list" },
        { label: t('fp.djMc.related2'), href: "/tables" },
        { label: t('fp.djMc.related3'), href: "/floor-plan" },
      ]}
    />
  );
};