import React from 'react';
import { ArrowRight, Building2, CakeSlice, Check, ChevronRight, Heart, HeartHandshake, Sparkles, TreePine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { eventTypeById, publicEventTypes, PublicEventType, PublicEventTypeId } from '@/content/publicEventTypes';
import { publicProducts } from '@/content/publicProducts';
import '@/styles/PublicSite.css';

const SITE_URL = 'https://weddingwaitress.com.au';
const iconByKey = { rings: HeartHandshake, sparkles: Sparkles, cake: CakeSlice, building: Building2, tree: TreePine, heart: Heart };

const EventTypeCard: React.FC<{ eventType: PublicEventType; featured?: boolean }> = ({ eventType, featured }) => {
  const Icon = iconByKey[eventType.icon];
  return <Link to={eventType.path} className={`ww-card ww-focus group flex h-full flex-col p-7 ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}>
    <span className="ww-icon-orb mb-5"><Icon size={23} aria-hidden="true" /></span>
    <h3 className="text-2xl font-semibold">{eventType.name}</h3>
    <p className="mt-3 flex-1 leading-7 text-[#6f625b]">{eventType.lead}</p>
    <span className="ww-public-link mt-6 inline-flex items-center gap-2 font-semibold">Explore {eventType.shortName} <ArrowRight size={17} aria-hidden="true" /></span>
  </Link>;
};

const breadcrumbs = (eventType?: PublicEventType) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Event Types', item: `${SITE_URL}/events` },
    ...(eventType ? [{ '@type': 'ListItem', position: 3, name: eventType.name, item: `${SITE_URL}${eventType.path}` }] : []),
  ],
});

const serviceSchema = (name: string, description: string, path: string) => ({
  '@context': 'https://schema.org', '@type': 'Service', name, description,
  url: `${SITE_URL}${path}`, areaServed: { '@type': 'Country', name: 'Australia' },
  provider: { '@type': 'Organization', name: 'Wedding Waitress', url: SITE_URL },
});

export const EventsIndex: React.FC = () => {
  const wedding = publicEventTypes[0];
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Event Planning Tools for Every Celebration | Wedding Waitress', description: 'Explore connected planning tools for weddings, engagements, parties, corporate events, seasonal celebrations and memorials.', url: `${SITE_URL}/events`, isPartOf: { '@type': 'WebSite', name: 'Wedding Waitress', url: SITE_URL } },
    serviceSchema('Event planning tools', 'Connected guest, seating, stationery, venue, schedule and memory-sharing tools for important gatherings.', '/events'),
    breadcrumbs(),
  ];
  return <div className="ww-public min-h-screen">
    <SeoHead title="Event Planning Tools for Every Celebration | Wedding Waitress" description="Explore connected planning tools for weddings, engagements, parties, corporate events, seasonal celebrations and memorials." canonicalPath="/events" jsonLd={jsonLd} />
    <Header />
    <main>
      <section className="ww-section overflow-hidden bg-[radial-gradient(circle_at_78%_18%,rgba(168,133,88,.22),transparent_36%)]">
        <div className="ww-container grid gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
          <div><nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-[#6f625b]"><Link to="/" className="ww-focus hover:text-[#6d4735]">Home</Link><ChevronRight size={15} aria-hidden="true" /><span>Event Types</span></nav><p className="ww-eyebrow mb-4">Event types</p><h1 className="ww-display">Thoughtful tools for every kind of gathering</h1><p className="ww-lead mt-7">Wedding Waitress adapts its connected guest, venue, stationery and event-day tools to the celebration you are organising.</p></div>
          <EventTypeCard eventType={wedding} featured />
        </div>
      </section>
      <section className="ww-section ww-section-cream"><div className="ww-container"><div className="max-w-3xl"><p className="ww-eyebrow mb-3">Choose your occasion</p><h2 className="ww-title">Start with the gathering in front of you</h2><p className="ww-lead mt-5">Each guide connects practical products to the people, place and pace of that event.</p></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{publicEventTypes.map((eventType) => <EventTypeCard key={eventType.id} eventType={eventType} />)}</div></div></section>
      <section className="ww-section"><div className="ww-container grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-start"><div><p className="ww-eyebrow mb-3">One flexible platform</p><h2 className="ww-title">The workflow changes with the occasion</h2></div><div className="grid gap-5 sm:grid-cols-2">{[
        ['Use only what is useful','A small gathering may need invitations and a guest list. A formal event may also need seating, venue documents, schedules and guest lookup.'],
        ['Keep information connected','The same event and attendee details can support the products you choose without becoming separate, conflicting plans.'],
        ['Prepare practical handovers','Turn current information into clear references for venues, caterers, hosts, DJs, MCs and other suppliers.'],
        ['Give guests simple access','Supported QR and browser experiences help guests participate without downloading another app.'],
      ].map(([title,text]) => <article key={title} className="ww-card p-6"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-[#6f625b]">{text}</p></article>)}</div></div></section>
      <section className="ww-section ww-section-espresso text-center"><div className="ww-container max-w-3xl"><p className="ww-eyebrow mb-3">Your event, your workflow</p><h2 className="ww-title">Bring the details together before the day begins</h2><p className="mt-5 text-lg leading-8 text-white/75">Start free with up to 20 guests and explore the complete connected platform.</p><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus mt-8">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink></div></section>
    </main><PublicFooter /><CookieBanner />
  </div>;
};

const EventTypePage: React.FC<{ eventTypeId: PublicEventTypeId }> = ({ eventTypeId }) => {
  const eventType = eventTypeById(eventTypeId);
  if (!eventType) return null;
  const Icon = iconByKey[eventType.icon];
  const products = eventType.productIds.map((id) => publicProducts.find((product) => product.id === id)).filter((product): product is NonNullable<typeof product> => Boolean(product));
  const relatedEvents = eventType.relatedEventIds.map((id) => eventTypeById(id)).filter((item): item is PublicEventType => Boolean(item));
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: eventType.seoTitle, description: eventType.metaDescription, url: `${SITE_URL}${eventType.path}`, isPartOf: { '@type': 'WebSite', name: 'Wedding Waitress', url: SITE_URL } },
    serviceSchema(`${eventType.name} planning tools`, eventType.metaDescription, eventType.path),
    breadcrumbs(eventType),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: eventType.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) },
  ];
  return <div className="ww-public min-h-screen">
    <SeoHead title={eventType.seoTitle} description={eventType.metaDescription} canonicalPath={eventType.path} jsonLd={jsonLd} />
    <Header />
    <main>
      <section className="ww-section overflow-hidden bg-[radial-gradient(circle_at_82%_22%,rgba(168,133,88,.23),transparent_36%)]"><div className="ww-container grid gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center"><div><nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[#6f625b]"><Link to="/" className="ww-focus hover:text-[#6d4735]">Home</Link><ChevronRight size={15} aria-hidden="true" /><Link to="/events" className="ww-focus hover:text-[#6d4735]">Event Types</Link><ChevronRight size={15} aria-hidden="true" /><span>{eventType.name}</span></nav><p className="ww-eyebrow mb-4">{eventType.eyebrow}</p><h1 className="ww-display">{eventType.h1}</h1><p className="ww-lead mt-7">{eventType.lead}</p><div className="mt-8 flex flex-wrap gap-3"><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink><a href="#event-products" className="ww-button-secondary ww-focus">See useful products</a></div></div><div className="ww-event-hero-mark" aria-hidden="true"><span className="ww-icon-orb"><Icon /></span><p>{eventType.name}</p></div></div></section>
      <section className="ww-section ww-section-cream"><div className="ww-container"><p className="ww-eyebrow mb-3">What needs attention</p><h2 className="ww-title max-w-3xl">Plan around the realities of {eventType.shortName.toLowerCase()}</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{eventType.challenges.map((challenge) => <article key={challenge.title} className="ww-card p-7"><h3 className="text-xl font-semibold">{challenge.title}</h3><p className="mt-3 leading-7 text-[#6f625b]">{challenge.text}</p></article>)}</div></div></section>
      <section id="event-products" className="ww-section scroll-mt-24"><div className="ww-container"><div className="max-w-3xl"><p className="ww-eyebrow mb-3">Connected products</p><h2 className="ww-title">A practical toolkit for this event</h2><p className="ww-lead mt-5">Choose the products that match your format. They work from the same event information.</p></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <Link key={product.id} to={product.path} className="ww-card ww-focus group p-6"><span className="ww-icon-orb mb-5"><product.icon size={22} aria-hidden="true" /></span><h3 className="text-xl font-semibold">{product.shortName}</h3><p className="mt-3 text-sm leading-6 text-[#6f625b]">{product.demonstration}</p><span className="ww-public-link mt-5 inline-flex items-center gap-2 font-semibold">View product <ArrowRight size={16} aria-hidden="true" /></span></Link>)}</div></div></section>
      <section className="ww-section ww-section-espresso"><div className="ww-container"><p className="ww-eyebrow mb-3">How it works</p><h2 className="ww-title max-w-3xl">From first details to a ready event</h2><ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{eventType.howItWorks.map((step,index) => <li key={step.title} className="ww-dark-surface rounded-3xl border border-white/15 p-6"><span className="text-sm font-bold text-[#d7b985]">0{index + 1}</span><h3 className="mt-4 text-xl font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{step.text}</p></li>)}</ol></div></section>
      <section className="ww-section"><div className="ww-container grid gap-10 lg:grid-cols-[1fr_.82fr]"><div><p className="ww-eyebrow mb-3">Practical benefits</p><h2 className="ww-title">Clarity for hosts, guests and suppliers</h2><div className="mt-8 space-y-5">{eventType.benefits.map((benefit) => <article key={benefit.title} className="flex gap-4"><span className="ww-icon-orb !h-11 !w-11"><Check size={18} aria-hidden="true" /></span><div><h3 className="text-lg font-semibold">{benefit.title}</h3><p className="mt-1 leading-7 text-[#6f625b]">{benefit.text}</p></div></article>)}</div></div><aside className="ww-card p-8"><p className="ww-eyebrow mb-3">Example workflow</p><h2 className="text-2xl font-semibold">{eventType.example.title}</h2><p className="mt-4 leading-8 text-[#6f625b]">{eventType.example.text}</p></aside></div></section>
      <section className="ww-section ww-section-cream"><div className="ww-container max-w-4xl"><div className="text-center"><p className="ww-eyebrow mb-3">Common questions</p><h2 className="ww-title">Planning {eventType.shortName.toLowerCase()}</h2></div><div className="mt-10 divide-y border-y">{eventType.faqs.map((faq) => <details key={faq.question} className="group py-5"><summary className="min-h-[44px] cursor-pointer list-none pr-8 text-lg font-semibold marker:hidden">{faq.question}<span className="float-right group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl leading-7 text-[#6f625b]">{faq.answer}</p></details>)}</div></div></section>
      <section className="ww-section"><div className="ww-container"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ww-eyebrow mb-3">Related event types</p><h2 className="ww-title">Explore another planning guide</h2></div><Link to="/events" className="ww-public-link ww-focus font-semibold">Explore all event types →</Link></div><div className="mt-9 grid gap-5 md:grid-cols-2">{relatedEvents.map((related) => <EventTypeCard key={related.id} eventType={related} />)}</div></div></section>
      <section className="ww-section ww-section-cream text-center"><div className="ww-container max-w-3xl"><h2 className="ww-title">Plan {eventType.shortName.toLowerCase()} in one connected place</h2><p className="mt-5 text-lg leading-8 text-[color:var(--ww-muted)]">Try Wedding Waitress free for seven days with up to 20 guests. No credit card required.</p><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus mt-8">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink></div></section>
    </main><PublicFooter /><CookieBanner />
  </div>;
};

export const EventWeddings = () => <EventTypePage eventTypeId="weddings" />;
export const EventEngagements = () => <EventTypePage eventTypeId="engagements" />;
export const EventBirthdaysParties = () => <EventTypePage eventTypeId="birthdays-parties" />;
export const EventCorporateEvents = () => <EventTypePage eventTypeId="corporate-events" />;
export const EventChristmasSeasonal = () => <EventTypePage eventTypeId="christmas-seasonal-events" />;
export const EventMemorials = () => <EventTypePage eventTypeId="memorials-celebrations-of-life" />;
