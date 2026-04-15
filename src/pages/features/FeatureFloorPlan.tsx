import { Link } from 'react-router-dom';
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
      { heading: "Design Your Venue Layout", text: <>Create a detailed floor plan for your wedding venue. Align your layout with your <Link to="/features/qr-seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">seating chart planner</Link> to ensure tables fit perfectly within your space.</> },
      { heading: "Plan Ceremony & Reception Setup", text: <>Design both your ceremony and reception layouts in one tool. Coordinate your <Link to="/features/qr-seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">table arrangements</Link> with the physical venue for a seamless flow.</> },
      { heading: "Visualise Seating Arrangements", text: "See how your tables and seating fit within your venue space. Adjust layouts in real time to ensure everything works perfectly on the day." },
    ]}
    relatedFeatures={[
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
      { label: "Full Seating Chart", href: "/features/full-seating" },
      { label: "Kiosk Check-In", href: "/features/kiosk" },
    ]}
  />
);
