import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dj-mc.jpg';

export const FeatureDjMc = () => (
  <FeaturePageLayout
    title="DJ & MC Questionnaire"
    description="Share a detailed questionnaire with your DJ or MC so they know exactly how to run your wedding reception. Include song requests, pronunciation guides, and timeline details — ensuring a flawless celebration."
    backgroundImage={bgImage}
  />
);
