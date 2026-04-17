import { ProductPageLayout } from '@/components/Layout/ProductPageLayout';

export const ProductDjMcQuestionnaire = () => (
  <ProductPageLayout
    pageTitle="Wedding DJ & MC Questionnaire | Plan Your Event Music"
    metaDescription="Create a DJ and MC questionnaire for your wedding or event. Plan music, announcements, and key moments to ensure everything runs perfectly."
    breadcrumbLabel="DJ-MC Questionnaire"
    h1="DJ & MC Questionnaire for Your Wedding"
    lead="Plan your music, announcements, and key moments with ease. Give your DJ or MC everything they need for a smooth and perfect event."
    primaryCta={{ label: 'Start Planning Your Event', href: '/dashboard' }}
    highlights={[
      { heading: 'Plan your music and key moments', text: 'Ensure everything happens at the right time.' },
      { heading: 'Provide clear instructions to your DJ or MC', text: 'Avoid confusion on your big day.' },
      { heading: 'Customise your event flow', text: 'Make your wedding truly yours.' },
      { heading: 'Works with your running sheet', text: 'Everything stays connected.' },
    ]}
    finalCtaLabel="Start Planning Your Event"
    finalCtaHref="/dashboard"
  />
);
