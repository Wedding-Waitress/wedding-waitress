import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductDietaryRequirements = () => {
  const { t } = useTranslation('landing');
  const h = t('products.dietary.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.dietary.pageTitle')}
      metaDescription={t('products.dietary.metaDescription')}
      breadcrumbLabel={t('explore.cards.dietary.heading')}
      h1={t('products.dietary.h1')}
      lead={t('products.dietary.lead')}
      primaryCta={{ label: t('products.dietary.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.dietary.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
