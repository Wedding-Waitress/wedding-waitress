import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductDietaryRequirements = () => (
  <ProductPageLayout
    pageTitle="Wedding Dietary Requirements Tracker | Manage Guest Needs"
    metaDescription="Track dietary requirements for your wedding guests. Manage allergies, preferences, and special requests easily in one place."
    breadcrumbLabel="Dietary Requirements"
    h1="Manage Guest Dietary Requirements"
    lead="Keep track of your guests’ dietary needs with ease. Manage allergies, preferences, and special requests in one organised system."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Track guest dietary needs', text: 'Easily record allergies and preferences.' },
      { heading: 'Stay organised and prepared', text: 'Avoid last-minute surprises.' },
      { heading: 'Perfect for catering coordination', text: 'Share details with your venue or caterer.' },
      { heading: 'Works with your guest list', text: 'Everything stays connected.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
