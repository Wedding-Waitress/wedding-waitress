/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-guest-list-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureSeating = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.seating.title')}
      description={t('fp.seating.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.seating.pageTitle')}
      metaDescription={t('fp.seating.metaDesc')}
      seoSections={[
        { heading: t('fp.seating.seo1Heading'), text: <Trans i18nKey="fp.seating.seo1Text" ns="landing" components={[<Link to="/qr-code-seating-chart" className={linkClass} />, <Link to="/invitations-cards" className={linkClass} />]} /> },
        { heading: t('fp.seating.seo2Heading'), text: <Trans i18nKey="fp.seating.seo2Text" ns="landing" components={[<Link to="/running-sheet-product" className={linkClass} />]} /> },
        { heading: t('fp.seating.seo3Heading'), text: t('fp.seating.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.seating.related1'), href: "/qr-code-seating-chart" },
        { label: t('fp.seating.related2'), href: "/running-sheet-product" },
        { label: t('fp.seating.related3'), href: "/invitations-cards" },
      ]}
    />
  );
};