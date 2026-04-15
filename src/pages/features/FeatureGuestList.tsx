import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-my-events.jpg';

export const FeatureGuestList = () => (
  <FeaturePageLayout
    title="My Events"
    description="Create and manage your wedding or event in one beautiful place. Add your ceremony and reception details, set guest limits, track RSVP deadlines, and stay organised from day one. Wedding Waitress gives you an all-in-one wedding planning app experience with guest list management, seating charts, digital invitations, QR code seating, and event planning tools designed to keep everything clear, simple, and stress-free."
    backgroundImage={bgImage}
  />
);
