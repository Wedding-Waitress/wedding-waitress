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
      { heading: "Send Online Wedding Invitations", text: "Create gorgeous digital invitations and share them instantly with your guests via email, SMS, or a personalised link. No printing, no postage, no delays." },
      { heading: "Manage RSVPs Digitally", text: "Track every response in real time. See who's attending, who's declined, and follow up with those who haven't replied — all from your dashboard." },
      { heading: "Create Beautiful Save the Dates", text: "Design stunning save the date cards that match your wedding style. Customise colours, fonts, and wording to make a lasting first impression." },
    ]}
    relatedFeatures={[
      { label: "QR Code RSVP", href: "/features/planning" },
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Place Cards", href: "/features/place-cards" },
    ]}
  />
);
