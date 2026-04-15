import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-events.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureEvents = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.events.title')}
      description={t('fp.events.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.events.pageTitle')}
      metaDescription={t('fp.events.metaDesc')}
      seoSections={[
        { heading: t('fp.events.seo1Heading'), text: <Trans i18nKey="fp.events.seo1Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.events.seo2Heading'), text: <Trans i18nKey="fp.events.seo2Text" ns="landing" components={[<Link to="/features/qr-seating" className={linkClass} />]} /> },
        { heading: t('fp.events.seo3Heading'), text: <Trans i18nKey="fp.events.seo3Text" ns="landing" components={[<Link to="/features/guest-list" className={linkClass} />]} /> },
      ]}
      relatedFeatures={[
        { label: t('fp.events.related1'), href: "/features/seating" },
        { label: t('fp.events.related2'), href: "/features/qr-seating" },
        { label: t('fp.events.related3'), href: "/features/guest-list" },
      ]}
    />
  );
};