import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-place-cards.jpg';

export const FeaturePlaceCards = () => (
  <FeaturePageLayout
    title="Elegant Name Place Cards"
    description="Create beautiful, print-ready wedding place cards in seconds. Choose from elegant templates, customise fonts and colours, and export at 300 DPI for professional-quality prints that impress every guest."
    backgroundImage={bgImage}
  />
);
