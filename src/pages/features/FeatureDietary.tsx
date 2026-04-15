import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dietary.jpg';

export const FeatureDietary = () => (
  <FeaturePageLayout
    title="Dietary Requirements Made Easy"
    description="Track every guest's dietary needs — from vegetarian and vegan to gluten-free and allergies. Generate kitchen-ready dietary charts sorted by table, so your caterer delivers the perfect meal to every seat."
    backgroundImage={bgImage}
  />
);
