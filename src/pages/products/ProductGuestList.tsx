/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductGuestList = () => {
  const { t } = useTranslation('landing');
  const h = t('products.guestList.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.guestList.pageTitle')}
      metaDescription={t('products.guestList.metaDescription')}
      breadcrumbLabel={t('explore.cards.guestList.heading')}
      h1={t('products.guestList.h1')}
      lead={t('products.guestList.lead')}
      primaryCta={{ label: t('products.guestList.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.guestList.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
