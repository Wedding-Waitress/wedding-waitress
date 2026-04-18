import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductFloorPlan = () => {
  const { t } = useTranslation('landing');
  const h = t('products.floorPlan.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.floorPlan.pageTitle')}
      metaDescription={t('products.floorPlan.metaDescription')}
      breadcrumbLabel={t('explore.cards.floorPlan.heading')}
      h1={t('products.floorPlan.h1')}
      lead={t('products.floorPlan.lead')}
      primaryCta={{ label: t('products.floorPlan.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.floorPlan.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
