import { Link } from 'react-router-dom';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-invitations-page.jpg';

export const FeatureInvitations = () => (
  <FeaturePageLayout
    title="Digital Wedding Invitations & RSVP Management"
    description="Design and send beautiful wedding invitations, save the dates, and thank you cards with ease. Create stunning digital or printable designs, customise your wording, and share instantly via email, SMS, or QR code."
    backgroundImage={bgImage}
    pageTitle="Digital Wedding Invitations & RSVP Cards | Easy Online Invites"
    metaDescription="Design and send beautiful digital wedding invitations, save the dates, and RSVP cards. Share instantly or download for print."
    seoSections={[
      { heading: "Send Online Wedding Invitations", text: <>Create gorgeous digital invitations and share them instantly with guests from your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link>. No printing, no postage, no delays.</> },
      { heading: "Manage RSVPs Digitally", text: <>Track every response in real time. Guests can also RSVP via your <Link to="/features/planning" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">QR code RSVP system</Link> for a seamless, modern experience.</> },
      { heading: "Create Beautiful Save the Dates", text: <>Design stunning save the date cards that match your wedding style. Once guests respond, assign them to tables using your <Link to="/features/qr-seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">seating chart planner</Link>.</> },
    ]}
    relatedFeatures={[
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "QR Code RSVP", href: "/features/planning" },
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
    ]}
  />
);
