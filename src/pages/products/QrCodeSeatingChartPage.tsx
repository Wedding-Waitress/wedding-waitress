import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { PublicPageHero } from '@/components/Layout/PublicPageHero';
import { SeoHead } from '@/components/SEO/SeoHead';
import { publicProducts, productById } from '@/content/publicProducts';
import { eventTypeById, relevantEventIdsByProduct } from '@/content/publicEventTypes';
import { publicHeroForRoute } from '@/config/publicHeroManifest';
import '@/styles/PublicSite.css';

const SITE_URL = 'https://weddingwaitress.com.au';
const PAGE_PATH = '/qr-code-seating-chart';
const PAGE_TITLE = 'QR Code Wedding Seating Chart | Wedding Waitress';
const META_DESCRIPTION = 'Create a QR code wedding seating chart so guests can scan, search their name and find their table. Try Wedding Waitress free for 7 days with up to 20 guests.';

const benefits = [
  {
    title: 'Find your table by name',
    text: 'Guests search their name on their phone to view their assigned table, without scanning a long printed list.',
  },
  {
    title: 'Display your QR code your way',
    text: 'Add your QR code to a seating chart sign, include it on stationery or display it on a screen at your reception.',
  },
  {
    title: 'Keep seating details connected',
    text: 'Manage guests and table assignments in Wedding Waitress, with saved seating updates reflected in the guest lookup.',
  },
];

const faqItems = [
  [
    'How does a QR code wedding seating chart work?',
    'You assign guests to tables in Wedding Waitress and display your event’s QR code. Guests scan it with their phone, open the guest lookup and search their name to see their assigned table.',
  ],
  [
    'Do guests need to download an app?',
    'No. Guests open the seating lookup in their phone’s web browser after scanning the QR code.',
  ],
  [
    'Where should I display my seating QR code?',
    'Place it where guests arrive, such as your reception entrance or welcome table. Use a clearly printed code with a short instruction inviting guests to scan and find their table.',
  ],
  [
    'What if a guest cannot use their phone?',
    'Keep a printed seating list available or arrange for a venue team member to help guests find their table.',
  ],
  [
    'Can I try Wedding Waitress before paying?',
    'Yes. You can try Wedding Waitress free for seven days with up to 20 guests. No credit card is required.',
  ],
] as const;

export const QrCodeSeatingChartPage = () => {
  const product = productById('qr-code-seating-chart');
  if (!product) return null;

  const related = product.related
    .map((id) => publicProducts.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const relevantEvents = (relevantEventIdsByProduct[product.id] ?? [])
    .map((id) => eventTypeById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: PAGE_TITLE,
      description: META_DESCRIPTION,
      url: `${SITE_URL}${PAGE_PATH}`,
      isPartOf: { '@type': 'WebSite', name: 'Wedding Waitress', url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
        { '@type': 'ListItem', position: 3, name: 'QR Code Seating Chart', item: `${SITE_URL}${PAGE_PATH}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ];

  return <div className="ww-public min-h-screen">
    <SeoHead title={PAGE_TITLE} description={META_DESCRIPTION} canonicalPath={PAGE_PATH} image={product.image} jsonLd={jsonLd} />
    <Header />
    <main>
      <PublicPageHero
        asset={publicHeroForRoute(PAGE_PATH)}
        eyebrow="QR CODE SEATING CHART"
        title="QR Code Wedding Seating Chart"
        description="Help every guest find their table. With Wedding Waitress, guests scan your QR code, search their name and view their assigned table on their phone—without downloading an app."
        breadcrumbs={<nav aria-label="Breadcrumb" className="ww-public-hero-breadcrumb mb-8 flex items-center gap-2 text-sm"><Link className="ww-focus" to="/products">Products</Link><ChevronRight size={15} aria-hidden="true" /><span>QR Code Seating Chart</span></nav>}
        actions={<><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink><a href="#product-demo" className="ww-button-hero-secondary ww-focus">See it in action</a></>}
        note="7-day free trial · Up to 20 guests · No credit card required"
      />

      <section id="product-demo" className="ww-section ww-section-cream scroll-mt-24">
        <div className="ww-container grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="ww-media-card" data-ww-parallax><img src={product.image} alt={`${product.imageAlt} product demonstration`} loading="lazy" className="aspect-[16/10] w-full object-cover" /></div>
          <div><p className="ww-eyebrow mb-3">HOW IT WORKS</p><h2 className="ww-title">Scan the code. Search your name. Find your table.</h2><p className="ww-lead mt-5">Create your tables, add your guests and assign their seating in Wedding Waitress. Then download your QR code to display on a welcome sign, stationery or screen. Guests scan the code and search their name to find where they’re sitting.</p></div>
        </div>
      </section>

      <section className="ww-section">
        <div className="ww-container">
          <div className="max-w-2xl"><p className="ww-eyebrow mb-3">WHY USE A DIGITAL SEATING CHART?</p><h2 className="ww-title">Make finding a table easier for your guests</h2></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">{benefits.map((benefit) => <article key={benefit.title} className="ww-card p-7"><div className="ww-icon-orb mb-5"><Check size={22} aria-hidden="true" /></div><h3 className="text-xl font-semibold">{benefit.title}</h3><p className="mt-3 leading-7 text-[#6f625b]">{benefit.text}</p></article>)}</div>
        </div>
      </section>

      <section className="ww-section ww-section-espresso">
        <div className="ww-container grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div><p className="ww-eyebrow mb-3">How it connects</p><h2 className="ww-title">Your guest list and tables, connected</h2></div>
          <p className="text-lg leading-8 text-white/75">Your QR code seating chart uses the guests and table assignments you manage in Wedding Waitress. Pair it with <Link to="/seating-chart-signs" className="ww-focus font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Seating Chart Signs</Link> and <Link to="/live-slideshow" className="ww-focus font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">Live Slideshow</Link> to help guests find their table when they arrive.</p>
        </div>
      </section>

      <section className="ww-section">
        <div className="ww-container">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ww-eyebrow mb-3">Related products</p><h2 className="ww-title">Complete your wedding seating setup</h2></div><Link to="/products" className="ww-public-link ww-focus font-semibold">Explore all products →</Link></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">{related.map((item) => <Link key={item.id} to={item.path} className="ww-card ww-focus group p-6"><span className="ww-icon-orb mb-5"><item.icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-semibold">{item.name}</h3><p className="mt-2 text-sm leading-6 text-[#6f625b]">{item.lead}</p></Link>)}</div>
        </div>
      </section>

      <section className="ww-section ww-section-cream">
        <div className="ww-container">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ww-eyebrow mb-3">Useful for</p><h2 className="ww-title">QR code seating for weddings and corporate events</h2></div><Link to="/events" className="ww-public-link ww-focus font-semibold">Explore all event types →</Link></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">{relevantEvents.map((eventType) => <Link key={eventType.id} to={eventType.path} className="ww-card ww-focus group p-6"><h3 className="text-lg font-semibold">{eventType.name}</h3><p className="mt-2 text-sm leading-6 text-[#6f625b]">{eventType.lead}</p><span className="ww-public-link mt-5 inline-flex items-center gap-2 font-semibold">View event guide <ArrowRight size={16} aria-hidden="true" /></span></Link>)}</div>
        </div>
      </section>

      <section className="ww-section">
        <div className="ww-container max-w-4xl">
          <div className="text-center"><p className="ww-eyebrow mb-3">Common questions</p><h2 className="ww-title">QR code wedding seating chart questions</h2></div>
          <div className="mt-10 divide-y border-y">{faqItems.map(([question, answer]) => <details key={question} className="group py-5"><summary className="ww-focus cursor-pointer list-none rounded pr-8 text-lg font-semibold marker:hidden">{question}<span className="float-right group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-4 max-w-3xl leading-7 text-[#6f625b]">{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="ww-section ww-section-cream text-center">
        <div className="ww-container max-w-3xl"><h2 className="ww-title">Create your wedding QR code seating chart</h2><p className="ww-lead mt-5">Set up your tables, add your guests and make it easy for everyone to find their place. Start your seven-day free trial with up to 20 guests. No credit card required.</p><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus mt-8">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink></div>
      </section>
    </main>
    <PublicFooter />
    <CookieBanner />
  </div>;
};
