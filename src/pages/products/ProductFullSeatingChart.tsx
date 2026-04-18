/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductFullSeatingChart = () => {
  const { t } = useTranslation('landing');
  const h = t('products.fullSeating.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.fullSeating.pageTitle')}
      metaDescription={t('products.fullSeating.metaDescription')}
      breadcrumbLabel={t('explore.cards.fullSeating.heading')}
      h1={t('products.fullSeating.h1')}
      lead={t('products.fullSeating.lead')}
      primaryCta={{ label: t('products.fullSeating.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.fullSeating.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
