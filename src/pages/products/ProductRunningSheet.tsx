import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductRunningSheet = () => (
  <ProductPageLayout
    pageTitle="Wedding Running Sheet Template | Event Timeline Planner"
    metaDescription="Create a wedding running sheet and event timeline easily. Plan every moment of your day and keep everything running smoothly."
    breadcrumbLabel="Running Sheet"
    h1="Create Your Wedding Running Sheet"
    lead="Plan your entire event timeline with ease. Organise every moment of your wedding or event and ensure everything runs perfectly."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Plan your full event timeline', text: 'Stay organised from start to finish.' },
      { heading: 'Keep everything running smoothly', text: 'Avoid delays and confusion.' },
      { heading: 'Perfect for weddings and events', text: 'Ensure every moment is planned.' },
      { heading: 'Works with your full event setup', text: 'Everything stays connected.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
