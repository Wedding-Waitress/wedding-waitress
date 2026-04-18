/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductMyEvents = () => {
  const { t } = useTranslation('landing');
  const h = t('products.myEvents.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.myEvents.pageTitle')}
      metaDescription={t('products.myEvents.metaDescription')}
      breadcrumbLabel={t('explore.cards.myEvents.heading')}
      h1={t('products.myEvents.h1')}
      lead={t('products.myEvents.lead')}
      primaryCta={{ label: t('products.myEvents.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.myEvents.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
