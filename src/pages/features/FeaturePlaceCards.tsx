/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-place-cards-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeaturePlaceCards = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.placeCards.title')}
      description={t('fp.placeCards.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.placeCards.pageTitle')}
      metaDescription={t('fp.placeCards.metaDesc')}
      seoSections={[
        { heading: t('fp.placeCards.seo1Heading'), text: <Trans i18nKey="fp.placeCards.seo1Text" ns="landing" components={[<Link to="/qr-code-seating-chart" className={linkClass} />]} /> },
        { heading: t('fp.placeCards.seo2Heading'), text: <Trans i18nKey="fp.placeCards.seo2Text" ns="landing" components={[<Link to="/individual-table-charts" className={linkClass} />]} /> },
        { heading: t('fp.placeCards.seo3Heading'), text: t('fp.placeCards.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.placeCards.related1'), href: "/qr-code-seating-chart" },
        { label: t('fp.placeCards.related2'), href: "/individual-table-charts" },
        { label: t('fp.placeCards.related3'), href: "/invitations-cards" },
      ]}
    />
  );
};