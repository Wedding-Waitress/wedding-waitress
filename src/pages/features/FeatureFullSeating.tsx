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
      { heading: "View Your Full Seating Chart", text: "See every table and guest in one comprehensive view. Your full seating chart gives you complete visibility over your entire event layout at a glance." },
      { heading: "Organise Every Guest Clearly", text: "Ensure no guest is missed or misplaced. Sort by table, name, or RSVP status to keep your seating plan accurate and up to date." },
      { heading: "Export Your Layout for Printing", text: "Download your complete seating chart as a professional PDF, ready for printing and sharing with your venue, coordinator, or wedding party." },
    ]}
  />
);
