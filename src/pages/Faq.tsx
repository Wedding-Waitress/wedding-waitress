import { publicFaqReviewSources } from '@/i18n/publicFaqReviewCopy';
import { publicLegalTermsSources } from '@/i18n/publicLegalTermsCopy';
import { PublicCopy } from '@/i18n/PublicCopy';
import { usePublicCopy } from '@/i18n/usePublicCopy';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import '@/styles/PublicSite.css';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { publicHeroForRoute } from '@/config/publicHeroManifest';

const faqItems: [string, string | readonly string[]][] = [
  ['What is Wedding Waitress?', 'Wedding Waitress is an all-in-one wedding planning and guest-experience platform for guests, RSVPs, seating, stationery, venue references, event-day planning and shared memories.'],
  ['Is it only for weddings?', 'Weddings are the platform’s main focus. It can also support engagements, birthdays, corporate events, workshops, seminars and other organised events.'],
  ['What is included?', 'Couple plans include access to the complete Wedding Waitress platform. You choose a plan according to the guest capacity you need.'],
  ['How does the seven-day free trial work?', 'The trial gives you seven days to explore the platform with up to 20 guests.'],
  ['Do I need a credit card for the trial?', 'No. A credit card is not required to start the seven-day trial.'],
  ['How long does a couple plan last?', 'Each couple plan covers one event and provides exactly 12 months of active planning access. You can extend for one month or any number of whole months at A$22 per month, paid upfront. Includes 10% GST worldwide.'],
  ["Can I add more events to my account?","Yes. With a current Essential, Premium or Ultimate plan, you can purchase additional event slots in the same account for $99 per event. Each is a one time purchase and uses your existing package’s access period. However, you only get free allocated SMS & Email credits in your first event to send out your RSVP & Digital Invitations. Additional SMS & Email credits can be purchased."],
  ['Is the couple-plan price a subscription?', 'No. Essential, Premium and Ultimate are one-event plans with 12 months of access, not monthly couple subscriptions.'],
  ['Is GST added?', publicFaqReviewSources[0]],
  ['How do the guest limits work?', 'Essential supports up to 150 guests, Premium up to 250 and Ultimate up to 450. The trial supports up to 20 guests.'],
  ['Can I upgrade?', 'Available upgrade options are shown through the account and checkout flow. If you are unsure which plan you need, contact Wedding Waitress before purchasing.'],
  ['Do guests need an app?', 'No. Guest-facing QR, gallery and lookup experiences open in a compatible web browser.'],
  ['How does QR seating work?', 'You create a unique event QR code. Guests scan it, search their name and view the table or seat information you have assigned and chosen to display.'],
  ['Can I print seating signs and stationery?', 'Wedding Waitress includes supported print-ready PDF exports for products such as seating signs, charts, invitations and place cards. Available formats are shown inside each product.'],
  ['Can I create invitations, Save the Date and Thank You cards?', 'Yes. All three card types are available in the Invitations & Cards designer, with supported text, background, QR and personalisation controls.'],
  ['Does Wedding Waitress include ceremony and reception floor plans?', 'Yes. The Floor Plan product provides separate ceremony and reception planning views based on the options supported in each layout.'],
  ['How does Live Slideshow work at a wedding?', 'Open the Live Slideshow on a venue touchscreen, tablet, laptop or desktop display. Guests can approach the device, search their name and find their table or seat.'],
  ['What is included in Photo & Video Sharing?', 'It brings together guest photo and short-video uploads, a gallery, digital guestbook, digital photo booth and live slideshow in one principal product.'],
  ['Can I share my Run Sheet and DJ & MC Questionnaire?', 'Both products include their own supported sharing and PDF controls so you can prepare information for the relevant venue and suppliers.'],
  ['What happens to access after 12 months?', 'Planning, data and download access ends when your paid period expires. Your saved account, including photos and videos, remains recoverable for six calendar months. A paid extension during that recovery period restores access from payment time. If you do not extend by the recovery deadline, the recoverable account and content are permanently removed from Wedding Waitress.'],
  ['What is the refund policy?', [publicLegalTermsSources[8], publicLegalTermsSources[10], publicLegalTermsSources[11]]],
];

export const Faq = () => {
  const copy = usePublicCopy();
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems.map(([q,a]) => ({ '@type': 'Question', name: copy(q), acceptedAnswer: { '@type': 'Answer', text: (typeof a === 'string' ? [a] : a).map(part => copy(part)).join(' ') } })) };
return <div className="ww-public min-h-screen"><SeoHead title={copy("Wedding Waitress FAQ | Plans, Guests, QR & Products")} description={copy("Answers about the Wedding Waitress trial, couple plans, guest limits, QR seating, stationery, floor plans, Live Slideshow, photo sharing and event-day tools.")} canonicalPath="/faq" jsonLd={schema} /><Header /><main><PublicPageHero compact asset={publicHeroForRoute('/faq')} eyebrow="Frequently asked questions" title="Answers before you start planning" description="Clear information about the platform, plans and the way guests and suppliers use Wedding Waitress." /><section className="ww-section"><div className="ww-container max-w-4xl"><div className="ww-event-faq-panel">{faqItems.map(([q,a]) => <details key={q} className="group py-5"><summary className="ww-focus cursor-pointer list-none rounded pr-8 text-lg font-semibold"><PublicCopy text={q} /><svg className="ww-event-faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><p className="mt-4 max-w-3xl leading-7 text-[#6f625b]">{(typeof a === 'string' ? [a] : a).map(part => <span key={part}>{copy(part)}{' '}</span>)}</p></details>)}</div><p className="mt-9 text-center text-[#6f625b]"><PublicCopy text={"Still need help? "} /><Link to="/contact" className="ww-public-link font-semibold"><PublicCopy text={"Contact Wedding Waitress"} /></Link>.</p></div></section></main><PublicFooter /><CookieBanner /></div>;
};
