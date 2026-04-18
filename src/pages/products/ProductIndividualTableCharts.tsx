/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductIndividualTableCharts = () => {
  const { t } = useTranslation('landing');
  const h = t('products.tableCharts.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.tableCharts.pageTitle')}
      metaDescription={t('products.tableCharts.metaDescription')}
      breadcrumbLabel={t('explore.cards.tableCharts.heading')}
      h1={t('products.tableCharts.h1')}
      lead={t('products.tableCharts.lead')}
      primaryCta={{ label: t('products.tableCharts.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.tableCharts.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
