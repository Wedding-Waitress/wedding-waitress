import { Link } from 'react-router-dom';
import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dietary-page.jpg';

export const FeatureDietary = () => (
  <FeaturePageLayout
    title="Wedding Dietary Requirements & Guest Meal Planner"
    description="Easily collect and manage dietary requirements for your wedding or event. Track guest allergies, preferences, and special meal requests in one organised system, ensuring every guest is catered for."
    backgroundImage={bgImage}
    pageTitle="Wedding Dietary Requirements List | Guest Meal Planner"
    metaDescription="Track guest dietary requirements including vegetarian, vegan, halal, and allergies. Share with your venue or caterer easily."
    seoSections={[
      { heading: "Track Guest Dietary Needs", text: <>Collect dietary requirements from every guest in your <Link to="/features/seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">wedding guest list</Link> — including vegetarian, vegan, halal, kosher, gluten-free, and custom preferences.</> },
      { heading: "Manage Allergies & Preferences", text: <>Keep a clear record of food allergies and special requests. This data syncs with your <Link to="/features/qr-seating" className="text-[#967A59] underline underline-offset-2 hover:text-[#7a6347]">seating chart</Link> so your venue team knows exactly what each table needs.</> },
      { heading: "Share with Caterers Easily", text: "Export your dietary summary and share it directly with your venue or caterer. Save time and avoid miscommunication on the day." },
    ]}
    relatedFeatures={[
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
      { label: "Place Cards", href: "/features/place-cards" },
    ]}
  />
);
