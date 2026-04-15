import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-seating.jpg';

export const FeatureSeating = () => (
  <FeaturePageLayout
    title="Seating Made Simple"
    description="Design your perfect wedding seating chart with intuitive drag-and-drop tools. Assign guests to tables, manage capacities, and create a reception layout your guests will love — all in minutes."
    backgroundImage={bgImage}
  />
);
