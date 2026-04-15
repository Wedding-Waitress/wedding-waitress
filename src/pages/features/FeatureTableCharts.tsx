import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-table-charts.jpg';

export const FeatureTableCharts = () => (
  <FeaturePageLayout
    title="Individual Table Charts"
    description="Generate detailed per-table seating charts for your wedding reception. Share individual table layouts with your venue coordinator, caterer, or bridal party — keeping everyone perfectly in sync on the big day."
    backgroundImage={bgImage}
  />
);
