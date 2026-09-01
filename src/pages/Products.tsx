import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Layout/Header';
import { PublicFooter } from '@/components/Layout/PublicFooter';
import { SeoHead } from '@/components/SEO/SeoHead';
import { CookieBanner } from '@/components/ui/CookieBanner';
import { productsByGroup } from '@/content/publicProducts';
import '@/styles/PublicSite.css';

export const Products = () => {
  const itemList = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: productsByGroup.flatMap((group) => group.products).map((product, index) => ({ '@type': 'ListItem', position: index + 1, name: product.name, url: `https://weddingwaitress.com.au${product.path}` })) };
  return <div className="ww-public min-h-screen"><SeoHead title="All Wedding Planning Products | Wedding Waitress" description="Explore all 16 connected Wedding Waitress products for budgets, guest lists, RSVPs, seating, stationery, event-day planning and guest photo sharing." canonicalPath="/products" jsonLd={itemList} /><Header /><main>
    <section className="ww-section ww-section-cream text-center"><div className="ww-container max-w-4xl"><p className="ww-eyebrow mb-4">The complete platform</p><h1 className="ww-display">Sixteen tools. One connected wedding plan.</h1><p className="ww-lead mx-auto mt-6 max-w-3xl">Plan budgets, guests and seating, create stationery and venue references, coordinate the day and bring guest memories together without managing a stack of disconnected products.</p></div></section>
    {productsByGroup.map((group, groupIndex) => <section key={group.name} className={`ww-section ${groupIndex % 2 ? 'ww-section-cream' : ''}`}><div className="ww-container"><div className="mb-9 flex items-end justify-between gap-4"><div><p className="ww-eyebrow mb-2">0{groupIndex + 1}</p><h2 className="ww-title">{group.name}</h2></div><p className="hidden max-w-md text-right text-sm leading-6 text-[#6f625b] md:block">Every product shares the event information it needs with the rest of Wedding Waitress.</p></div><div className={`grid gap-6 md:grid-cols-2 ${group.products.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>{group.products.map((product) => <Link key={product.id} to={product.path} className="ww-card ww-focus group overflow-hidden"><div className="aspect-[16/10] overflow-hidden bg-[#2b1711]"><img src={product.image} alt={product.imageAlt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /></div><div className="p-6"><div className="ww-icon-orb mb-5"><product.icon size={22} aria-hidden="true" /></div><h3 className="text-xl font-semibold">{product.name}</h3><p className="mt-3 text-sm leading-6 text-[#6f625b]">{product.demonstration}</p><span className="ww-product-link mt-5 inline-flex items-center gap-2 font-semibold">Learn More <ArrowRight size={17} aria-hidden="true" /></span></div></Link>)}</div></div></section>)}
  </main><PublicFooter /><CookieBanner /></div>;
};
