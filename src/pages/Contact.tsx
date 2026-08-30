import { ContactForm } from '@/components/ContactForm';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import '@/styles/PublicSite.css';

export const Contact = () => {
  const schema = { '@context': 'https://schema.org', '@type': 'ContactPage', name: 'Contact Wedding Waitress', url: 'https://weddingwaitress.com.au/contact' };
  return <div className="ww-public min-h-screen"><SeoHead title="Contact Wedding Waitress | Product & Planning Help" description="Contact Wedding Waitress for help with the platform, plans, guest management, seating, stationery and wedding-day planning tools." canonicalPath="/contact" jsonLd={schema} /><Header /><main><section className="ww-section ww-section-cream"><div className="ww-container grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div><p className="ww-eyebrow mb-3">Contact</p><h1 className="ww-title">How can we help?</h1><p className="ww-lead mt-5">Ask about the platform, product features or choosing the right plan for your wedding. The existing secure form will send your message to the Wedding Waitress team.</p><div className="ww-dark-surface mt-8 rounded-3xl bg-[#2b1711] p-7 text-white"><h2 className="text-xl font-semibold">Planning a wedding?</h2><p className="mt-3 leading-7 text-white/70">Include the product you are using and a short description of what you need help with. Please do not include passwords or payment-card details.</p></div></div><div className="ww-card p-6 md:p-9"><ContactForm /></div></div></section></main><PublicFooter /><CookieBanner /></div>;
};
