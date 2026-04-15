import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-floor-plan-page.jpg';

export const FeatureFloorPlan = () => (
  <FeaturePageLayout
    title="Venue Floor Plan"
    description="Design and visualise your wedding or event layout with an easy-to-use venue floor plan tool. Arrange tables, ceremony seating, stages, and key areas to match your space perfectly. Wedding Waitress helps you plan both ceremony and reception layouts with clarity, giving you a complete visual overview so everything runs smoothly on the day."
    backgroundImage={bgImage}
    pageTitle="Wedding Floor Plan Creator | Venue Layout & Seating Design"
    metaDescription="Design your wedding venue layout with a visual floor plan tool. Arrange seating, ceremony setup, and reception flow."
  />
);
