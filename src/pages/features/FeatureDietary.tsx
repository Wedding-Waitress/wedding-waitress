import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dietary-page.jpg';

export const FeatureDietary = () => (
  <FeaturePageLayout
    title="Dietary Requirements"
    description="Easily collect and manage dietary requirements for your wedding or event. Track guest allergies, preferences, and special meal requests in one organised system, ensuring every guest is catered for. Wedding Waitress helps you streamline communication with venues and caterers, making meal planning simple, accurate, and stress-free."
    backgroundImage={bgImage}
    pageTitle="Wedding Dietary Requirements List | Guest Meal Planner"
    metaDescription="Track guest dietary requirements including vegetarian, vegan, halal, and allergies. Share with your venue or caterer easily."
  />
);
