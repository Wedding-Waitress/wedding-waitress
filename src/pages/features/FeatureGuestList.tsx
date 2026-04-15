import { Link } from 'react-router-dom';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-my-events.jpg';

export const FeatureGuestList = () => (
  <FeaturePageLayout
    title="Wedding Timeline Planner & Running Sheet Tool"
    description="Create and manage your wedding or event in one beautiful place. Add your ceremony and reception details, set guest limits, track RSVP deadlines, and stay organised from day one."
    backgroundImage={bgImage}
    pageTitle="Wedding Timeline Planner | Running Sheet & Schedule Tool"
    metaDescription="Create a detailed wedding timeline and running sheet. Plan every moment from ceremony to reception with ease."
    seoSections={[
      { heading: "Plan Your Wedding Schedule", text: <>Build a detailed timeline for your wedding day. Coordinate timing with your <Link to="/features/dj-mc" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">DJ & MC questionnaire</Link> to keep music and announcements perfectly aligned.</> },
      { heading: "Organise Every Moment", text: <>Structure your ceremony, reception, speeches, and entertainment into a clear running sheet. Reference your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link> to ensure key moments include the right people.</> },
      { heading: "Share Timeline with Vendors", text: "Export and share your running sheet with your venue, photographer, DJ, and wedding party so everyone is aligned and prepared." },
    ]}
    relatedFeatures={[
      { label: "DJ & MC Questionnaire", href: "/features/dj-mc" },
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Event Manager", href: "/features/events" },
    ]}
  />
);
