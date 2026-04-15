import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-events.jpg';

export const FeatureEvents = () => (
  <FeaturePageLayout
    title="Your Events, Your Way"
    description="Manage multiple weddings, engagements, or corporate events from a single dashboard. Customise each event with unique settings, guest lists, and seating plans — perfect for couples and professional event planners alike."
    backgroundImage={bgImage}
    pageTitle="Wedding Event Manager | Plan Multiple Events Easily"
    metaDescription="Manage multiple weddings and events from one dashboard. Customise settings, guest lists, and seating plans for each event."
    seoSections={[
      { heading: "Manage Multiple Events from One Place", text: "Whether you're planning a wedding, engagement party, or corporate function, manage all your events from a single, organised dashboard." },
      { heading: "Customise Each Event Individually", text: "Set unique guest limits, venues, timelines, and seating plans for every event. Each one gets its own dedicated settings and guest list." },
      { heading: "Perfect for Couples & Planners", text: "Wedding Waitress is built for both couples planning their own wedding and professional event planners managing multiple clients and events." },
    ]}
  />
);
