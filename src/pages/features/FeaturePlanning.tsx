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
        { heading: t('fp.planning.seo1Heading'), text: <Trans i18nKey="fp.planning.seo1Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.planning.seo2Heading'), text: <Trans i18nKey="fp.planning.seo2Text" ns="landing" components={[<Link to="/features/qr-seating" className={linkClass} />]} /> },
        { heading: t('fp.planning.seo3Heading'), text: <Trans i18nKey="fp.planning.seo3Text" ns="landing" components={[<Link to="/features/kiosk" className={linkClass} />]} /> },
      ]}
      relatedFeatures={[
        { label: t('fp.planning.related1'), href: "/features/seating" },
        { label: t('fp.planning.related2'), href: "/features/qr-seating" },
        { label: t('fp.planning.related3'), href: "/features/kiosk" },
      ]}
    />
  );
};