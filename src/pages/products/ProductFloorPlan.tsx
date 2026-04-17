import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductFloorPlan = () => (
  <ProductPageLayout
    pageTitle="Wedding Floor Plan Creator | Plan Your Event Layout Online"
    metaDescription="Design your wedding floor plan online. Arrange tables, seating, and layout easily and create the perfect event setup."
    breadcrumbLabel="Floor Plan"
    h1="Create Your Wedding Floor Plan"
    lead="Plan your event layout with ease. Arrange tables, seating, and spacing to create the perfect flow for your wedding or event."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Design your full event layout', text: 'Visualise how your event space will look.' },
      { heading: 'Arrange tables and seating easily', text: 'Create the perfect setup for your guests.' },
      { heading: 'Optimise space and flow', text: 'Ensure a smooth and enjoyable guest experience.' },
      { heading: 'Works with your seating chart', text: 'Everything stays connected and organised.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
