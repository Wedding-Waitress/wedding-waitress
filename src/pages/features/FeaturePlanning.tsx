import { Link } from 'react-router-dom';
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
      { heading: "Let Guests RSVP Instantly via QR Code", text: <>Share a single QR code that lets guests confirm their attendance from your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link>, update dietary needs, and respond to your invitation — all from their phone in seconds.</> },
      { heading: "Provide Digital Seating Information", text: <>Guests scan and instantly see their table from your <Link to="/features/qr-seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">seating chart</Link>, seat assignment, and event details. No more printed charts or confusion at the door.</> },
      { heading: "Simplify Guest Experience at Your Event", text: <>Create a modern, tech-forward guest experience. Pair your QR code with a <Link to="/features/kiosk" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">kiosk live view</Link> at your venue entrance for even smoother guest flow.</> },
    ]}
    relatedFeatures={[
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
      { label: "Kiosk Check-In", href: "/features/kiosk" },
    ]}
  />
);
