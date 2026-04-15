import { Link } from 'react-router-dom';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-tables-page.jpg';

export const FeatureQrSeating = () => (
  <FeaturePageLayout
    title="Wedding Seating Chart Planner & Table Management"
    description="Create and organise your wedding tables with ease using a smart table planning tool. Set up table names, assign guests, balance numbers, and visually manage seating arrangements for your reception."
    backgroundImage={bgImage}
    pageTitle="Wedding Seating Chart Planner | Organise Tables & Guests"
    metaDescription="Create and manage your wedding seating chart with ease. Assign guests to tables, balance groups, and design your perfect reception layout."
    seoSections={[
      { heading: "Create Your Wedding Seating Chart Easily", text: <>Import your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link> and assign tables in minutes with an intuitive drag-and-drop interface. See your full layout come together visually as you build it.</> },
      { heading: "Assign Guests to Tables with Precision", text: <>Place guests exactly where they belong. Once your tables are set, let guests find their seats instantly via <Link to="/features/planning" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">QR code</Link> on the day.</> },
      { heading: "Optimise Your Reception Layout", text: <>Ensure every table is balanced and every guest has the best experience. Pair your seating chart with a <Link to="/features/floor-plan" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">venue floor plan</Link> for complete visual control over your reception.</> },
    ]}
    relatedFeatures={[
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "QR Code RSVP", href: "/features/planning" },
      { label: "Floor Plan Creator", href: "/features/floor-plan" },
    ]}
  />
);
