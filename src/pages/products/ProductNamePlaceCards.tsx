/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductNamePlaceCards = () => {
  const { t } = useTranslation('landing');
  const h = t('products.placeCards.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.placeCards.pageTitle')}
      metaDescription={t('products.placeCards.metaDescription')}
      breadcrumbLabel={t('explore.cards.placeCards.heading')}
      h1={t('products.placeCards.h1')}
      lead={t('products.placeCards.lead')}
      primaryCta={{ label: t('products.placeCards.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.placeCards.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
