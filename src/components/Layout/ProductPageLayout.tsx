import React from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthGatedCtaLink } from '@/components/auth/AuthGatedCtaLink';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { photoVideoSectionIds, publicProducts, productById } from '@/content/publicProducts';
import { eventTypeById, relevantEventIdsByProduct } from '@/content/publicEventTypes';
import { Header } from './Header';
import { PublicFooter } from './PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import '@/styles/PublicSite.css';

export interface ProductPageLayoutProps { productId: string }
const SITE_URL = 'https://weddingwaitress.com.au';

export const ProductPageLayout: React.FC<ProductPageLayoutProps> = ({ productId }) => {
  const product = productById(productId);
  if (!product) return null;
  const related = product.related.map((id) => publicProducts.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const relevantEvents = (relevantEventIdsByProduct[product.id] ?? []).map((id) => eventTypeById(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: product.seoTitle, description: product.metaDescription, url: `${SITE_URL}${product.path}`, isPartOf: { '@type': 'WebSite', name: 'Wedding Waitress', url: SITE_URL } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}${product.path}` },
    ] },
  ];

  return <div className="ww-public min-h-screen">
    <SeoHead title={product.seoTitle} description={product.metaDescription} canonicalPath={product.path} image={product.image} jsonLd={jsonLd} />
    <Header />
    <main>
      <section className="ww-section overflow-hidden bg-[radial-gradient(circle_at_85%_20%,rgba(168,133,88,.20),transparent_35%)]">
        <div className="ww-container grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-[#6f625b]"><Link className="ww-focus hover:text-[#6d4735]" to="/products">Products</Link><ChevronRight size={15} aria-hidden="true" /><span>{product.name}</span></nav>
            <p className="ww-eyebrow mb-4">{product.group}</p><h1 className="ww-display max-w-3xl">{product.h1}</h1><p className="ww-lead mt-7 max-w-2xl">{product.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3"><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink><a href="#product-demo" className="ww-button-secondary ww-focus">See it in action</a></div>
            <p className="mt-4 text-sm text-[#6f625b]">7-day free trial · Up to 20 guests · No credit card required</p>
          </div>
          <div className="ww-image-frame" data-ww-parallax><img src={product.image} alt={product.imageAlt} width="1200" height="750" /></div>
        </div>
      </section>
      <section id="product-demo" className="ww-section ww-section-cream scroll-mt-24"><div className="ww-container grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div className="ww-media-card" data-ww-parallax><img src={product.image} alt={`${product.imageAlt} product demonstration`} loading="lazy" className="aspect-[16/10] w-full object-cover" /></div><div><p className="ww-eyebrow mb-3">What you can do</p><h2 className="ww-title">Make this part of planning feel simpler</h2><p className="ww-lead mt-5">{product.demonstration}</p></div></div></section>
      <section className="ww-section"><div className="ww-container"><div className="max-w-2xl"><p className="ww-eyebrow mb-3">Why it helps</p><h2 className="ww-title">Practical tools for a real wedding workflow</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{product.benefits.map((benefit) => <article key={benefit.title} className="ww-card p-7"><div className="ww-icon-orb mb-5"><Check size={22} aria-hidden="true" /></div><h3 className="text-xl font-semibold">{benefit.title}</h3><p className="mt-3 leading-7 text-[#6f625b]">{benefit.text}</p></article>)}</div></div></section>
      {product.id === 'photo-video-sharing' && <section className="ww-section ww-section-cream"><div className="ww-container"><p className="ww-eyebrow mb-3">Five connected experiences</p><h2 className="ww-title max-w-3xl">Let guests contribute, interact and enjoy the moments together</h2><nav aria-label="Photo and video features" className="mt-7 flex flex-wrap gap-2">{photoVideoSectionIds.map((id, index) => <a key={id} href={`#${id}`} className="ww-public-link ww-brand-border ww-focus rounded-full border bg-white px-4 py-2 text-sm font-semibold">{['Sharing','Gallery','Guestbook','Photo Booth','Live Slideshow'][index]}</a>)}</nav><div className="mt-10 grid gap-5 md:grid-cols-2">{[
        ['sharing','Photo & Video Sharing','Guests scan your event QR code and upload photos or short videos from their phone. There is no separate app for them to install, keeping participation straightforward during the celebration.'],['gallery','Photo & Video Gallery','Shared moments come together in a dedicated event gallery for browsing. It provides one coherent view of guest contributions instead of leaving memories scattered across private messages.'],['guestbook','Digital Guestbook','Guests can leave the supported written, audio or video messages and well wishes enabled for the event. The experience gives people another way to contribute when a traditional paper guestbook is not enough.'],['photo-booth','Digital Photo Booth','The on-screen photo booth creates a playful capture moment for guests at the venue. It sits alongside sharing and guestbook features as part of the same event experience.'],['live-slideshow','Live Slideshow','Turn uploaded photos into a live slideshow for a venue screen during or after the event. New guest contributions and the shared gallery become part of the celebration rather than something seen only later.'],
      ].map(([id,title,text], index) => <article id={photoVideoSectionIds[index]} key={id} className="ww-card scroll-mt-24 p-7"><h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-[#6f625b]">{text}</p></article>)}</div></div></section>}
      <section className="ww-section ww-section-espresso"><div className="ww-container grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><p className="ww-eyebrow mb-3">How it connects</p><h2 className="ww-title">One product, part of one platform</h2></div><p className="text-lg leading-8 text-white/75">{product.connects}</p></div></section>
      <section className="ww-section"><div className="ww-container"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ww-eyebrow mb-3">Related products</p><h2 className="ww-title">Continue your planning flow</h2></div><Link to="/products" className="ww-public-link ww-focus font-semibold">Explore all products →</Link></div><div className="mt-9 grid gap-5 md:grid-cols-3">{related.map((item) => <Link key={item.id} to={item.path} className="ww-card ww-focus group p-6"><span className="ww-icon-orb mb-5"><item.icon size={22} aria-hidden="true" /></span><h3 className="text-lg font-semibold">{item.name}</h3><p className="mt-2 text-sm leading-6 text-[#6f625b]">{item.lead}</p></Link>)}</div></div></section>
      {relevantEvents.length > 0 && <section className="ww-section ww-section-cream"><div className="ww-container"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="ww-eyebrow mb-3">Useful for</p><h2 className="ww-title">See this product in an event workflow</h2></div><Link to="/events" className="ww-public-link ww-focus font-semibold">Explore all event types →</Link></div><div className="mt-9 grid gap-5 md:grid-cols-3">{relevantEvents.map((eventType) => <Link key={eventType.id} to={eventType.path} className="ww-card ww-focus group p-6"><h3 className="text-lg font-semibold">{eventType.name}</h3><p className="mt-2 text-sm leading-6 text-[#6f625b]">{eventType.lead}</p><span className="ww-public-link mt-5 inline-flex items-center gap-2 font-semibold">View event guide <ArrowRight size={16} aria-hidden="true" /></span></Link>)}</div></div></section>}
      <section className="ww-section ww-section-cream text-center"><div className="ww-container max-w-3xl"><h2 className="ww-title">Start planning {product.shortName.toLowerCase()} in one connected place</h2><p className="ww-lead mt-5">Try Wedding Waitress free for seven days with up to 20 guests. No credit card required.</p><AuthGatedCtaLink to="/dashboard" alwaysSignUp className="ww-button-primary ww-focus mt-8">Start Planning Free <ArrowRight size={18} aria-hidden="true" /></AuthGatedCtaLink></div></section>
    </main>
    <PublicFooter /><CookieBanner />
  </div>;
};
