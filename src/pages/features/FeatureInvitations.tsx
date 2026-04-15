import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-invitations.jpg';

export const FeatureInvitations = () => (
  <FeaturePageLayout
    title="Invitations & RSVPs"
    description="Design stunning digital wedding invitations and track RSVPs in real time. Send beautiful custom invites via email, collect responses automatically, and never chase a reply again."
    backgroundImage={bgImage}
  />
);
