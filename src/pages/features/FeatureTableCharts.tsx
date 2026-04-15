import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-individual-table-chart-page.jpg';

const linkClass = "text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]";

export const FeatureTableCharts = () => {
  const { t } = useTranslation('landing');
  return (
    <FeaturePageLayout
      title={t('fp.tableCharts.title')}
      description={t('fp.tableCharts.description')}
      backgroundImage={bgImage}
      pageTitle={t('fp.tableCharts.pageTitle')}
      metaDescription={t('fp.tableCharts.metaDesc')}
      seoSections={[
        { heading: t('fp.tableCharts.seo1Heading'), text: <Trans i18nKey="fp.tableCharts.seo1Text" ns="landing" components={[<Link to="/features/full-seating" className={linkClass} />]} /> },
        { heading: t('fp.tableCharts.seo2Heading'), text: <Trans i18nKey="fp.tableCharts.seo2Text" ns="landing" components={[<Link to="/features/seating" className={linkClass} />]} /> },
        { heading: t('fp.tableCharts.seo3Heading'), text: t('fp.tableCharts.seo3Text') },
      ]}
      relatedFeatures={[
        { label: t('fp.tableCharts.related1'), href: "/features/full-seating" },
        { label: t('fp.tableCharts.related2'), href: "/features/seating" },
        { label: t('fp.tableCharts.related3'), href: "/features/place-cards" },
      ]}
    />
  );
};