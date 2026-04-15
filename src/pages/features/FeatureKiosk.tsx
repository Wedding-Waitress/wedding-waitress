import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-kiosk.jpg';

export const FeatureKiosk = () => (
  <FeaturePageLayout
    title="Kiosk Live View"
    description="Set up a self-service check-in kiosk at your venue entrance. Guests search their name and instantly see their table assignment — creating a seamless, modern arrival experience for your wedding or event."
    backgroundImage={bgImage}
  />
);
