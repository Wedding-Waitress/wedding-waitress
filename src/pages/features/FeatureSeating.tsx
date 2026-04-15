import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-guest-list-page.jpg';

export const FeatureSeating = () => (
  <FeaturePageLayout
    title="Wedding Guest List Management & RSVP Tracker"
    description="Effortlessly manage your wedding guest list with a powerful and easy-to-use guest list manager. Add guests individually or as couples and families, track RSVPs in real-time, manage plus-ones, and organise seating arrangements with complete clarity."
    backgroundImage={bgImage}
    pageTitle="Wedding Guest List Manager | Track RSVPs & Guests Easily"
    metaDescription="Easily manage your wedding guest list, track RSVPs, organise families, and control plus-ones with our powerful wedding guest list manager tool."
    seoSections={[
      { heading: "Manage Your Wedding Guest List Online", text: "Add, edit, and organise your entire wedding guest list from any device. Keep track of every guest, couple, and family group in one central place with real-time updates." },
      { heading: "Track RSVPs in Real Time", text: "See who's attending, who's declined, and who's yet to respond — all updated instantly. Never chase RSVPs manually again with automated tracking and status updates." },
      { heading: "Organise Guests, Families & Plus-Ones", text: "Group guests into families, manage plus-ones, and assign relationships with ease. Wedding Waitress keeps your guest list structured and clear, no matter the size of your event." },
    ]}
    relatedFeatures={[
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
      { label: "QR Code RSVP", href: "/features/planning" },
      { label: "Dietary Requirements", href: "/features/dietary" },
    ]}
  />
);
