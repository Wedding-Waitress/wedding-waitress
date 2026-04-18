/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductKioskLiveView = () => {
  const { t } = useTranslation('landing');
  const h = t('products.kioskLiveView.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.kioskLiveView.pageTitle')}
      metaDescription={t('products.kioskLiveView.metaDescription')}
      breadcrumbLabel={t('explore.cards.kioskLiveView.heading')}
      h1={t('products.kioskLiveView.h1')}
      lead={t('products.kioskLiveView.lead')}
      primaryCta={{ label: t('products.kioskLiveView.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.kioskLiveView.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
