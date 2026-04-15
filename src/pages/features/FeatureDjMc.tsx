import { FeaturePageLayout } from '@/components/Layout/FeaturePageLayout';
import bgImage from '@/assets/features/feature-dj-mc-page.jpg';

export const FeatureDjMc = () => (
  <FeaturePageLayout
    title="Wedding Music Planner & DJ MC Questionnaire"
    description="Take the stress out of planning your music, announcements, and event flow with a complete DJ and MC questionnaire. Capture key details like song selections, special moments, run sheet timing, and important instructions — all in one place."
    backgroundImage={bgImage}
    pageTitle="Wedding Music Planner | DJ & MC Song List Organizer"
    metaDescription="Plan your wedding music with a complete DJ and MC questionnaire. Organise songs, entrances, and special moments easily."
    seoSections={[
      { heading: "Plan Ceremony & Reception Music", text: "Organise every musical moment from the ceremony entrance to the last dance. Capture song choices, timing cues, and special requests in one structured questionnaire." },
      { heading: "Organise Song Lists", text: "Build your must-play, do-not-play, and maybe lists with ease. Keep your music selections organised and easy to share with your DJ or MC." },
      { heading: "Coordinate with Your DJ & MC", text: "Share your completed questionnaire directly with your DJ or MC. Ensure they have every detail they need for a seamless, perfectly timed event." },
    ]}
    relatedFeatures={[
      { label: "Timeline & Running Sheet", href: "/features/guest-list" },
      { label: "Guest List Manager", href: "/features/seating" },
      { label: "Floor Plan Creator", href: "/features/floor-plan" },
    ]}
  />
);
