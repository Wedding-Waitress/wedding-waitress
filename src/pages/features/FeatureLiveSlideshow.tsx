/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-live-slideshow-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureLiveSlideshow = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.liveSlideshow.title')}
      description={t('fp.liveSlideshow.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.liveSlideshow.pageTitle')}
      metaDescription={t('fp.liveSlideshow.metaDesc')}
      seoSections={[
        { heading: t('fp.liveSlideshow.seo1Heading'), text: <Trans i18nKey="fp.liveSlideshow.seo1Text" ns="landing" components={[<Link to="/running-sheet" className={linkClass} />]} /> },
        { heading: t('fp.liveSlideshow.seo2Heading'), text: <Trans i18nKey="fp.liveSlideshow.seo2Text" ns="landing" components={[<Link to="/tables" className={linkClass} />]} /> },
        { heading: t('fp.liveSlideshow.seo3Heading'), text: t('fp.liveSlideshow.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.liveSlideshow.related1'), href: "/running-sheet" },
        { label: t('fp.liveSlideshow.related2'), href: "/tables" },
        { label: t('fp.liveSlideshow.related3'), href: "/qr-code-seating-chart" },
      ]}
    />
  );
};
