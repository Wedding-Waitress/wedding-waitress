import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-floor-plan-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureFloorPlan = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.floorPlan.title')}
      description={t('fp.floorPlan.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.floorPlan.pageTitle')}
      metaDescription={t('fp.floorPlan.metaDesc')}
      seoSections={[
        { heading: t('fp.floorPlan.seo1Heading'), text: <Trans i18nKey="fp.floorPlan.seo1Text" ns="landing" components={[<Link to="/features/qr-seating" className={linkClass} />]} /> },
        { heading: t('fp.floorPlan.seo2Heading'), text: <Trans i18nKey="fp.floorPlan.seo2Text" ns="landing" components={[<Link to="/features/qr-seating" className={linkClass} />]} /> },
        { heading: t('fp.floorPlan.seo3Heading'), text: t('fp.floorPlan.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.floorPlan.related1'), href: "/features/qr-seating" },
        { label: t('fp.floorPlan.related2'), href: "/features/full-seating" },
        { label: t('fp.floorPlan.related3'), href: "/features/kiosk" },
      ]}
    />
  );
};