import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-floor-plan.jpg';

export const FeatureFloorPlan = () => (
  <FeaturePageLayout
    title="Venue Floor Plan"
    description="Visualise your ceremony and reception layout with an interactive floor plan designer. Arrange seating rows, assign guests to specific seats, and share the layout with your venue — bringing your wedding vision to life."
    backgroundImage={bgImage}
  />
);
