import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import '@/styles/PublicSite.css';

const faqItems = [
  ['What is Wedding Waitress?', 'Wedding Waitress is an all-in-one wedding planning and guest-experience platform for guests, RSVPs, seating, stationery, venue references, event-day planning and shared memories.'],
  ['Is it only for weddings?', 'Weddings are the platform’s main focus. It can also support engagements, birthdays, corporate events, workshops, seminars and other organised events.'],
  ['What is included?', 'Couple plans include access to the complete Wedding Waitress platform. You choose a plan according to the guest capacity you need.'],
  ['How does the seven-day free trial work?', 'The trial gives you seven days to explore the platform with up to 20 guests.'],
  ['Do I need a credit card for the trial?', 'No. A credit card is not required to start the seven-day trial.'],
  ['How long does a couple plan last?', 'Each couple plan covers one event and provides 12 months of active planning access, followed by a 30-day download-only window for available photos, videos and exports.'],
  ['Is the couple-plan price a subscription?', 'No. Essential, Premium and Ultimate are one-event plans with 12 months of access, not monthly couple subscriptions.'],
  ['Is GST added?', 'Prices are shown in Australian dollars and exclude GST. GST is calculated at checkout.'],
  ['How do the guest limits work?', 'Essential supports up to 100 guests, Premium up to 200 and Ultimate up to 500. The trial supports up to 20 guests.'],
  ['Can I upgrade?', 'Available upgrade options are shown through the account and checkout flow. If you are unsure which plan you need, contact Wedding Waitress before purchasing.'],
  ['Do guests need an app?', 'No. Guest-facing QR, gallery and lookup experiences open in a compatible web browser.'],
  ['How does QR seating work?', 'You create a unique event QR code. Guests scan it, search their name and view the table or seat information you have assigned and chosen to display.'],
  ['Can I print seating signs and stationery?', 'Wedding Waitress includes supported print-ready PDF exports for products such as seating signs, charts, invitations and place cards. Available formats are shown inside each product.'],
  ['Can I create invitations, Save the Dates and Thank You cards?', 'Yes. All three card types are available in the Invitations & Cards designer, with supported text, background, QR and personalisation controls.'],
  ['Does Wedding Waitress include ceremony and reception floor plans?', 'Yes. The Floor Plan product provides separate ceremony and reception planning views based on the options supported in each layout.'],
  ['How does Kiosk Live View work at a wedding?', 'Open the event kiosk on a venue touchscreen, tablet, laptop or desktop display. Guests can approach the device, search their name and find their table or seat.'],
  ['What is included in Photo & Video Sharing?', 'It brings together guest photo and short-video uploads, a gallery, digital guestbook, digital photo booth and live slideshow in one principal product.'],
  ['Can I share my Run Sheet and DJ & MC Questionnaire?', 'Both products include their own supported sharing and PDF controls so you can prepare information for the relevant venue and suppliers.'],
  ['Is Wedding Waitress suitable for venues and event professionals?', 'Vendor Pro is designed for eligible venues and event professionals. It is A$299 per month plus GST in Australia and requires approval.'],
  ['What happens to access after 12 months?', 'Active planning access ends after 12 months. You then receive a 30-day download-only window to save available photos, videos and platform exports. This does not add another month of editing or event-management access; normal retention and account policies apply afterwards.'],
  ['What is the refund policy?', 'Paid plans are generally non-refundable once activated. Please review the current Terms of Service for the complete approved policy and contact support if you believe there has been an error.'],
];

export const Faq = () => {
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(([q,a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  return <div className="ww-public min-h-screen"><SeoHead title="Wedding Waitress FAQ | Plans, Guests, QR & Products" description="Answers about the Wedding Waitress trial, couple plans, guest limits, QR seating, stationery, floor plans, kiosk view, photo sharing and event-day tools." canonicalPath="/faq" jsonLd={schema} /><Header /><main><section className="ww-section ww-section-cream"><div className="ww-container max-w-4xl text-center"><p className="ww-eyebrow mb-3">Frequently asked questions</p><h1 className="ww-display">Answers before you start planning</h1><p className="ww-lead mx-auto mt-6 max-w-2xl">Clear information about the platform, plans and the way guests and suppliers use Wedding Waitress.</p></div></section><section className="ww-section"><div className="ww-container max-w-4xl"><div className="divide-y border-y">{faqItems.map(([q,a]) => <details key={q} className="group py-5"><summary className="ww-focus cursor-pointer list-none rounded pr-8 text-lg font-semibold">{q}<span className="float-right group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-4 max-w-3xl leading-7 text-[#6f625b]">{a}</p></details>)}</div><p className="mt-9 text-center text-[#6f625b]">Still need help? <Link to="/contact" className="ww-public-link font-semibold">Contact Wedding Waitress</Link>.</p></div></section></main><PublicFooter /><CookieBanner /></div>;
};
