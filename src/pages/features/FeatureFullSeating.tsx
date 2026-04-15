import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-full-seating-chart-page.jpg';

export const FeatureFullSeating = () => (
  <FeaturePageLayout
    title="Full Seating Chart"
    description="Visualise your entire wedding or event with a complete seating chart in one clear view. Easily organise tables, assign guests, and manage seating arrangements with a simple and intuitive layout. Wedding Waitress gives you full control over your seating plan, helping you create a well-balanced, organised, and stress-free event experience for you and your guests."
    backgroundImage={bgImage}
    pageTitle="Full Wedding Seating Chart | Complete Guest Layout Planner"
    metaDescription="View and export your full wedding seating chart. Organise every guest, table, and seat in one clear layout."
  />
);
