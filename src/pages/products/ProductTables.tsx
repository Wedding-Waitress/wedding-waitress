import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductTables = () => {
  const { t } = useTranslation('landing');
  const h = t('products.tables.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.tables.pageTitle')}
      metaDescription={t('products.tables.metaDescription')}
      breadcrumbLabel={t('explore.cards.tables.heading')}
      h1={t('products.tables.h1')}
      lead={t('products.tables.lead')}
      primaryCta={{ label: t('products.tables.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.tables.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
