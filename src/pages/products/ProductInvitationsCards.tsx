import { useTranslation } from 'react-i18next';
import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductInvitationsCards = () => {
  const { t } = useTranslation('landing');
  const h = t('products.invitationsCards.h', { returnObjects: true }) as string[][];
  return (
    <ProductPageLayout
      pageTitle={t('products.invitationsCards.pageTitle')}
      metaDescription={t('products.invitationsCards.metaDescription')}
      breadcrumbLabel={t('explore.cards.invitationsCards.heading')}
      h1={t('products.invitationsCards.h1')}
      lead={t('products.invitationsCards.lead')}
      primaryCta={{ label: t('products.invitationsCards.primaryCta'), href: '/dashboard' }}
      highlights={h.map(([heading, text]) => ({ heading, text }))}
      finalCtaLabel={t('products.invitationsCards.finalCtaLabel')}
      finalCtaHref="/dashboard"
    />
  );
};
