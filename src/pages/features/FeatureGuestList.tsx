import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-guest-list.jpg';

export const FeatureGuestList = () => (
  <FeaturePageLayout
    title="Guest List Management"
    description="Effortlessly organise your wedding guest list with our powerful event planning tool. Track RSVPs, manage plus-ones, group families, and keep every detail in one place — so you can focus on celebrating, not spreadsheets."
    backgroundImage={bgImage}
  />
);
