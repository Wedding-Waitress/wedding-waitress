/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-my-events.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureGuestList = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.guestList.title')}
      description={t('fp.guestList.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.guestList.pageTitle')}
      metaDescription={t('fp.guestList.metaDesc')}
      seoSections={[
        { heading: t('fp.guestList.seo1Heading'), text: <Trans i18nKey="fp.guestList.seo1Text" ns="landing" components={[<Link to="/features/dj-mc" className={linkClass} />]} /> },
        { heading: t('fp.guestList.seo2Heading'), text: <Trans i18nKey="fp.guestList.seo2Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.guestList.seo3Heading'), text: t('fp.guestList.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.guestList.related1'), href: "/features/dj-mc" },
        { label: t('fp.guestList.related2'), href: "/features/seating" },
        { label: t('fp.guestList.related3'), href: "/features/events" },
      ]}
    />
  );
};