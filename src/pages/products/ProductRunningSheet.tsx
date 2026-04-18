import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductRunningSheet = () => {
  const { t } = useTranslation('landing');
  const h = t('products.runningSheet.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.runningSheet.pageTitle')}
      metaDescription={t('products.runningSheet.metaDescription')}
      breadcrumbLabel={t('explore.cards.runningSheet.heading')}
      h1={t('products.runningSheet.h1')}
      lead={t('products.runningSheet.lead')}
      primaryCta={{ label: t('products.runningSheet.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.runningSheet.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
