import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-qr-code-page.jpg';

export const FeaturePlanning = () => (
  <FeaturePageLayout
    title="QR Code Seating Chart"
    description="Give your guests a seamless, modern experience with a QR code seating chart. Guests simply scan the code to instantly find their table, seat, and event details on their phone — no confusion, no waiting. Wedding Waitress combines digital seating charts, guest lookup, RSVP access, and event information into one powerful QR code system, making your wedding or event smarter, faster, and stress-free."
    backgroundImage={bgImage}
  />
);
