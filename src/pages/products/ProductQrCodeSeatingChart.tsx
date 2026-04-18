import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductQrCodeSeatingChart = () => {
  const { t } = useTranslation('landing');
  const h = t('products.qrSeating.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.qrSeating.pageTitle')}
      metaDescription={t('products.qrSeating.metaDescription')}
      breadcrumbLabel={t('explore.cards.qrSeating.heading')}
      h1={t('products.qrSeating.h1')}
      lead={t('products.qrSeating.lead')}
      primaryCta={{ label: t('products.qrSeating.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.qrSeating.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
