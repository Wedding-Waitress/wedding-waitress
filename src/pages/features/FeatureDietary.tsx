import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dietary-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureDietary = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.dietary.title')}
      description={t('fp.dietary.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.dietary.pageTitle')}
      metaDescription={t('fp.dietary.metaDesc')}
      seoSections={[
        { heading: t('fp.dietary.seo1Heading'), text: <Trans i18nKey="fp.dietary.seo1Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.dietary.seo2Heading'), text: <Trans i18nKey="fp.dietary.seo2Text" ns="landing" components={[<Link to="/features/qr-seating" className={linkClass} />]} /> },
        { heading: t('fp.dietary.seo3Heading'), text: t('fp.dietary.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.dietary.related1'), href: "/features/seating" },
        { label: t('fp.dietary.related2'), href: "/features/qr-seating" },
        { label: t('fp.dietary.related3'), href: "/features/place-cards" },
      ]}
    />
  );
};