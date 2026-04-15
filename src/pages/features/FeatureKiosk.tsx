import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-kiosk-page.jpg';

export const FeatureKiosk = () => (
  <FeaturePageLayout
    title="Corporate Kiosk Live View"
    description="Create a professional and interactive guest experience with a live kiosk display. Allow guests to quickly search their name and find their table, seat, or event details on a digital screen. Wedding Waitress transforms your seating chart into a live, easy-to-use kiosk system, perfect for weddings, corporate events, and large functions where organisation and guest flow matter most."
    backgroundImage={bgImage}
    pageTitle="Wedding Check-In Kiosk | Guest Lookup & Entry System"
    metaDescription="Set up a live guest check-in kiosk. Let guests search their name and find their table instantly at your event entrance."
  />
);
