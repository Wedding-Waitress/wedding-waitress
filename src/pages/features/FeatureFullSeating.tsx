import { Link } from 'react-router-dom';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-full-seating-chart-page.jpg';

export const FeatureFullSeating = () => (
  <FeaturePageLayout
    title="Complete Wedding Seating Chart & Guest Layout Planner"
    description="Visualise your entire wedding or event with a complete seating chart in one clear view. Easily organise tables, assign guests, and manage seating arrangements with a simple and intuitive layout."
    backgroundImage={bgImage}
    pageTitle="Full Wedding Seating Chart | Complete Guest Layout Planner"
    metaDescription="View and export your full wedding seating chart. Organise every guest, table, and seat in one clear layout."
    seoSections={[
      { heading: "View Your Full Seating Chart", text: <>See every table and guest in one comprehensive view. For a closer look at each table, use the <Link to="/features/table-charts" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">individual table seating charts</Link>.</> },
      { heading: "Organise Every Guest Clearly", text: <>Ensure no guest is missed or misplaced. Your full chart pulls directly from your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link>, keeping everything in sync.</> },
      { heading: "Export Your Layout for Printing", text: "Download your complete seating chart as a professional PDF, ready for printing and sharing with your venue, coordinator, or wedding party." },
    ]}
    relatedFeatures={[
      { label: "Individual Table Charts", href: "/features/table-charts" },
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
    ]}
  />
);
