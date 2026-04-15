import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-full-seating.jpg';

export const FeatureFullSeating = () => (
  <FeaturePageLayout
    title="Full Seating Chart"
    description="View your entire wedding seating arrangement at a glance. Export a beautifully formatted master seating chart as PDF or print-ready document — ideal for display boards, venue staff, and day-of coordination."
    backgroundImage={bgImage}
  />
);
