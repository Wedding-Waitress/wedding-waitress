import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dietary-page.jpg';

export const FeatureDietary = () => (
  <FeaturePageLayout
    title="Wedding Dietary Requirements & Guest Meal Planner"
    description="Easily collect and manage dietary requirements for your wedding or event. Track guest allergies, preferences, and special meal requests in one organised system, ensuring every guest is catered for."
    backgroundImage={bgImage}
    pageTitle="Wedding Dietary Requirements List | Guest Meal Planner"
    metaDescription="Track guest dietary requirements including vegetarian, vegan, halal, and allergies. Share with your venue or caterer easily."
    seoSections={[
      { heading: "Track Guest Dietary Needs", text: "Collect and organise dietary requirements from every guest — including vegetarian, vegan, halal, kosher, gluten-free, and custom preferences — all in one place." },
      { heading: "Manage Allergies & Preferences", text: "Keep a clear record of food allergies and special requests. Wedding Waitress ensures nothing is overlooked when it comes to guest meal planning." },
      { heading: "Share with Caterers Easily", text: "Export your dietary summary and share it directly with your venue or caterer. Save time and avoid miscommunication on the day." },
    ]}
  />
);
