import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductMyEvents = () => (
  <ProductPageLayout
    pageTitle="Manage Your Events Online | Wedding & Event Planner Tool"
    metaDescription="Easily create and manage your wedding or event in one place. Stay organised, track details, and plan your event effortlessly with Wedding Waitress."
    breadcrumbLabel="My Events"
    h1="Manage Your Wedding or Event Easily"
    lead="Plan and organise your entire event from one simple dashboard. Keep everything in one place and stay in control."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    secondaryCta={{ label: 'View Features', href: '/features/events' }}
    highlights={[
      {
        heading: 'Create and manage multiple events',
        text: 'Run weddings, engagements, and receptions side by side without losing track of a single detail.',
      },
      {
        heading: 'Keep all your event details organised',
        text: 'Dates, venues, guest lists, and timings — everything you need lives in one tidy place.',
      },
      {
        heading: 'Access everything from one dashboard',
        text: 'Jump between events, tools, and reports instantly from a single, clean interface.',
      },
      {
        heading: 'Simple and easy to use',
        text: 'Designed to be intuitive from the first click. No training, no clutter — just plan.',
      },
    ]}
    finalCtaHeading="Start planning your event today"
    finalCtaText="Create your first event in minutes and bring everything together in one place."
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
