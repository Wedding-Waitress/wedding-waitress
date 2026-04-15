import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-place-cards-page.jpg';

export const FeaturePlaceCards = () => (
  <FeaturePageLayout
    title="Wedding Place Cards Generator & Printable Name Cards"
    description="Create elegant and personalised name place cards for your wedding or event in just minutes. Easily generate guest names, customise fonts and layouts, and print professional-quality place cards directly from your seating plan."
    backgroundImage={bgImage}
    pageTitle="Wedding Place Cards Generator | Printable Name Cards"
    metaDescription="Create elegant wedding place cards with guest names and table numbers. Download printable designs for your reception."
    seoSections={[
      { heading: "Create Elegant Name Place Cards", text: "Design beautiful place cards with your guests' names, table numbers, and seat assignments. Choose from a range of elegant fonts and styles to match your wedding theme." },
      { heading: "Print Professional Guest Cards", text: "Export your place cards in high-resolution 300 DPI format, ready for professional printing. Every card is perfectly formatted for a polished table presentation." },
      { heading: "Customise Table & Seating Details", text: "Add personalised messages, dietary icons, and custom styling to each place card. Wedding Waitress makes every detail count for a memorable guest experience." },
    ]}
    relatedFeatures={[
      { label: "Seating Chart Planner", href: "/features/qr-seating" },
      { label: "Individual Table Charts", href: "/features/table-charts" },
      { label: "Digital Invitations", href: "/features/invitations" },
    ]}
  />
);
