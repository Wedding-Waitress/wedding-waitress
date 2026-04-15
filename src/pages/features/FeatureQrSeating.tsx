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
      { heading: "Create Your Wedding Seating Chart Easily", text: "Build your seating chart in minutes with an intuitive drag-and-drop interface. Assign guests to tables and see your full layout come together visually." },
      { heading: "Assign Guests to Tables with Precision", text: "Place guests exactly where they belong. Balance table numbers, keep families together, and manage capacity limits to create the perfect reception flow." },
      { heading: "Optimise Your Reception Layout", text: "Ensure every table is balanced and every guest has the best experience. Wedding Waitress helps you plan a well-organised reception layout that works for your venue." },
    ]}
  />
);
