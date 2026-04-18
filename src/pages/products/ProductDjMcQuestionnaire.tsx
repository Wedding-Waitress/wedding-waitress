/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductDjMcQuestionnaire = () => {
  const { t } = useTranslation('landing');
  const h = t('products.djMc.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.djMc.pageTitle')}
      metaDescription={t('products.djMc.metaDescription')}
      breadcrumbLabel={t('explore.cards.djMc.heading')}
      h1={t('products.djMc.h1')}
      lead={t('products.djMc.lead')}
      primaryCta={{ label: t('products.djMc.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.djMc.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
