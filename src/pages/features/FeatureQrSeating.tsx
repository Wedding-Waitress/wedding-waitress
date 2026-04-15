import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-qr-seating.jpg';

export const FeatureQrSeating = () => (
  <FeaturePageLayout
    title="Instant Guest Seating"
    description="Let guests scan a QR code and instantly find their table and seat number on their phone. No more crowding around a seating board — give your wedding a modern, stress-free arrival experience."
    backgroundImage={bgImage}
  />
);
