import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-qr-code-page.jpg';

export const FeaturePlanning = () => (
  <FeaturePageLayout
    title="QR Code Wedding RSVP & Guest Seating Access"
    description="Give your guests a seamless, modern experience with a QR code seating chart. Guests simply scan the code to instantly find their table, seat, and event details on their phone — no confusion, no waiting."
    backgroundImage={bgImage}
    pageTitle="QR Code Wedding RSVP & Seating Chart | Digital Guest Access"
    metaDescription="Let guests scan a QR code to find their seat, RSVP, and access event details instantly. Simplify your wedding with smart digital tools."
    seoSections={[
      { heading: "Let Guests RSVP Instantly via QR Code", text: "Share a single QR code that lets guests confirm their attendance, update dietary needs, and respond to your invitation — all from their phone in seconds." },
      { heading: "Provide Digital Seating Information", text: "Guests scan and instantly see their table number, seat assignment, and event details. No more printed charts or confusion at the door." },
      { heading: "Simplify Guest Experience at Your Event", text: "Create a modern, tech-forward guest experience that reduces stress for you and your guests. One scan gives them everything they need to know." },
    ]}
  />
);
