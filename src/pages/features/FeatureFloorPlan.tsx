import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-floor-plan-page.jpg';

export const FeatureFloorPlan = () => (
  <FeaturePageLayout
    title="Wedding Floor Plan Creator & Venue Layout Designer"
    description="Design and visualise your wedding or event layout with an easy-to-use venue floor plan tool. Arrange tables, ceremony seating, stages, and key areas to match your space perfectly."
    backgroundImage={bgImage}
    pageTitle="Wedding Floor Plan Creator | Venue Layout & Seating Design"
    metaDescription="Design your wedding venue layout with a visual floor plan tool. Arrange seating, ceremony setup, and reception flow."
    seoSections={[
      { heading: "Design Your Venue Layout", text: "Create a detailed floor plan for your wedding venue. Place tables, stages, dance floors, and key features exactly where they need to be." },
      { heading: "Plan Ceremony & Reception Setup", text: "Design both your ceremony and reception layouts in one tool. Visualise aisle seating, altar placement, and reception flow before the big day." },
      { heading: "Visualise Seating Arrangements", text: "See how your tables and seating fit within your venue space. Adjust layouts in real time to ensure everything works perfectly on the day." },
    ]}
  />
);
