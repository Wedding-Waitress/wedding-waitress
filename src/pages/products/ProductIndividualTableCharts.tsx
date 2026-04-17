import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductIndividualTableCharts = () => (
  <ProductPageLayout
    pageTitle="Table Seating Chart Maker | Individual Table Plans"
    metaDescription="Create individual table seating charts for your wedding or event. Organise guests per table and make seating simple and clear."
    breadcrumbLabel="Individual Table Charts"
    h1="Create Individual Table Seating Charts"
    lead="Organise each table with ease. Assign guests, manage seating, and keep every table clear and well-structured."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Create seating for each table', text: 'Focus on one table at a time.' },
      { heading: 'Assign guests easily', text: 'Drag and organise guests per table.' },
      { heading: 'Keep seating clear and organised', text: 'Avoid confusion on the day.' },
      { heading: 'Works with full seating chart', text: 'Everything stays connected.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
