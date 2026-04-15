import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-individual-table-chart-page.jpg';

export const FeatureTableCharts = () => (
  <FeaturePageLayout
    title="Individual Table Seating Charts"
    description="Create clear and beautifully organised individual table seating charts for your wedding or event. Display each table's guest list with ease, making it simple for guests to find their seats quickly and confidently."
    backgroundImage={bgImage}
    pageTitle="Individual Table Seating Charts | Wedding Table Layout Tool"
    metaDescription="Generate detailed seating charts for each table. Perfect for printing and helping guests find their seats quickly."
    seoSections={[
      { heading: "Generate Per-Table Seating Charts", text: "Create a dedicated seating chart for each table at your reception. Display guest names, seat numbers, and dietary details in a clean, easy-to-read format." },
      { heading: "Print & Display at Your Venue", text: "Export individual table charts for printing and place them at each table or near the entrance. Help guests find their seats without any confusion." },
      { heading: "Customise Layout & Styling", text: "Adjust fonts, colours, and layout options to match your wedding design. Every table chart is tailored to look professional and on-brand." },
    ]}
  />
);
