import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-planning.jpg';

export const FeaturePlanning = () => (
  <FeaturePageLayout
    title="Plan Every Moment"
    description="Stay organised from engagement to 'I do' with our complete wedding planning toolkit. Build your running sheet, coordinate vendors, and manage timelines — your ultimate wedding organiser in one dashboard."
    backgroundImage={bgImage}
  />
);
