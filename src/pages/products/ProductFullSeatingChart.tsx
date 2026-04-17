import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductFullSeatingChart = () => (
  <ProductPageLayout
    pageTitle="Wedding Seating Chart Maker | Full Seating Plan Online"
    metaDescription="Create a complete wedding seating chart online. Organise guests, tables, and seating arrangements easily in one place."
    breadcrumbLabel="Full Seating Chart"
    h1="Create Your Full Wedding Seating Chart"
    lead="Design and organise your entire seating plan with ease. Manage guests, tables, and seating all in one simple view."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'View your entire seating chart in one place', text: 'Get a complete overview of your event layout.' },
      { heading: 'Organise guests and tables easily', text: 'Keep everything structured and clear.' },
      { heading: 'Perfect for large weddings and events', text: 'Handle any size event with ease.' },
      { heading: 'Works with guest list and tables', text: 'Everything stays connected and updated.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
