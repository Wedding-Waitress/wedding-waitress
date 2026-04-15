import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-kiosk-page.jpg';

export const FeatureKiosk = () => (
  <FeaturePageLayout
    title="Wedding Guest Check-In Kiosk & Live Lookup System"
    description="Create a professional and interactive guest experience with a live kiosk display. Allow guests to quickly search their name and find their table, seat, or event details on a digital screen."
    backgroundImage={bgImage}
    pageTitle="Wedding Check-In Kiosk | Guest Lookup & Entry System"
    metaDescription="Set up a live guest check-in kiosk. Let guests search their name and find their table instantly at your event entrance."
    seoSections={[
      { heading: "Enable Guest Self Check-In", text: "Set up a digital kiosk at your venue entrance so guests can check themselves in. It's fast, professional, and reduces queues on arrival." },
      { heading: "Instant Table Lookup", text: "Guests simply search their name and instantly see their table number, seat assignment, and event details — no staff assistance needed." },
      { heading: "Improve Event Entry Experience", text: "Create a smooth, modern arrival experience that impresses your guests and keeps your event running on time from the very first moment." },
    ]}
  />
);
