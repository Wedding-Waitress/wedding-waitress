/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-invitations-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureInvitations = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.invitations.title')}
      description={t('fp.invitations.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.invitations.pageTitle')}
      metaDescription={t('fp.invitations.metaDesc')}
      seoSections={[
        { heading: t('fp.invitations.seo1Heading'), text: <Trans i18nKey="fp.invitations.seo1Text" ns="landing" components={[<Link to="/tables" className={linkClass} />]} /> },
        { heading: t('fp.invitations.seo2Heading'), text: <Trans i18nKey="fp.invitations.seo2Text" ns="landing" components={[<Link to="/running-sheet" className={linkClass} />]} /> },
        { heading: t('fp.invitations.seo3Heading'), text: <Trans i18nKey="fp.invitations.seo3Text" ns="landing" components={[<Link to="/qr-code-seating-chart" className={linkClass} />]} /> },
      ]}
      relatedFeatures={[
        { label: t('fp.invitations.related1'), href: "/tables" },
        { label: t('fp.invitations.related2'), href: "/running-sheet" },
        { label: t('fp.invitations.related3'), href: "/qr-code-seating-chart" },
      ]}
    />
  );
};