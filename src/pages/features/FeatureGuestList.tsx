import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-my-events.jpg';

export const FeatureGuestList = () => (
  <FeaturePageLayout
    title="Wedding Timeline Planner & Running Sheet Tool"
    description="Create and manage your wedding or event in one beautiful place. Add your ceremony and reception details, set guest limits, track RSVP deadlines, and stay organised from day one."
    backgroundImage={bgImage}
    pageTitle="Wedding Timeline Planner | Running Sheet & Schedule Tool"
    metaDescription="Create a detailed wedding timeline and running sheet. Plan every moment from ceremony to reception with ease."
    seoSections={[
      { heading: "Plan Your Wedding Schedule", text: "Build a detailed timeline for your wedding day — from getting ready to the final send-off. Keep every moment organised and on track." },
      { heading: "Organise Every Moment", text: "Structure your ceremony, reception, speeches, and entertainment into a clear running sheet that everyone can follow on the day." },
      { heading: "Share Timeline with Vendors", text: "Export and share your running sheet with your venue, photographer, DJ, and wedding party so everyone is aligned and prepared." },
    ]}
  />
);
