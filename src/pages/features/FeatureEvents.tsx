import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-events.jpg';

export const FeatureEvents = () => (
  <FeaturePageLayout
    title="Your Events, Your Way"
    description="Manage multiple weddings, engagements, or corporate events from a single dashboard. Customise each event with unique settings, guest lists, and seating plans — perfect for couples and professional event planners alike."
    backgroundImage={bgImage}
    pageTitle="Wedding Event Manager | Plan Multiple Events Easily"
    metaDescription="Manage multiple weddings and events from one dashboard. Customise settings, guest lists, and seating plans for each event."
  />
);
