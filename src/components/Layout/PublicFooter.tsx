import React from 'react';
import { ArrowUp, Facebook, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productsByGroup } from '@/content/publicProducts';
import { publicEventTypes } from '@/content/publicEventTypes';
import { PublicHomeLogoLink } from '@/components/Layout/PublicHomeLogoLink';

type PublicFooterProps = {
  showBackToTop?: boolean;
};

export const PublicFooter: React.FC<PublicFooterProps> = ({ showBackToTop = false }) => {
  return <footer className="ww-public-dashboard-background px-4 py-14 text-white">
    <div className="mx-auto max-w-7xl">
    <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[.85fr_2.15fr]">
      <div><PublicHomeLogoLink className="ww-public-footer-home-logo inline-flex"><img src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" className="h-12 w-auto brightness-0 invert" /></PublicHomeLogoLink><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">An all-in-one wedding planning and guest-experience platform for guests, RSVPs, seating, stationery, event-day details and shared memories.</p><div className="mt-6 flex gap-3">{[[Instagram,'Instagram'],[Facebook,'Facebook'],[Youtube,'YouTube']].map(([Icon,label]) => { const SocialIcon = Icon as typeof Instagram; return <a key={label as string} href="#" aria-label={`Wedding Waitress on ${label}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 hover:bg-white/10"><SocialIcon size={18} aria-hidden="true" /></a>; })}</div></div>
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {productsByGroup.map((group) => <div key={group.name}><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#d7b985]">{group.name}</h2><ul className="mt-4 space-y-2">{group.products.map((product) => <li key={product.path}><Link className="text-sm text-white/65 hover:text-white" to={product.path}>{product.shortName}</Link></li>)}</ul></div>)}
        <div><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#d7b985]">Event Types</h2><ul className="mt-4 space-y-2">{publicEventTypes.map((eventType) => <li key={eventType.path}><Link className="text-sm text-white/65 hover:text-white" to={eventType.path}>{eventType.shortName}</Link></li>)}</ul></div>
      </div>
    </div>
    <div className="flex flex-col gap-5 pt-8 text-sm text-white/55 lg:flex-row lg:items-center lg:justify-between"><nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer"><Link className="hover:font-semibold hover:text-white" to="/how-it-works">How It Works</Link><Link className="hover:font-semibold hover:text-white" to="/products">Products</Link><Link className="hover:font-semibold hover:text-white" to="/events">Event Types</Link><Link className="hover:font-semibold hover:text-white" to="/pricing">Pricing</Link><Link className="hover:font-semibold hover:text-white" to="/blog">Blog</Link><Link className="hover:font-semibold hover:text-white" to="/faq">FAQ</Link><Link className="hover:font-semibold hover:text-white" to="/contact">Contact</Link><Link className="hover:font-semibold hover:text-white" to="/dashboard">Sign In</Link><Link className="hover:font-semibold hover:text-white" to="/privacy">Privacy</Link><Link className="hover:font-semibold hover:text-white" to="/terms">Terms</Link><Link className="hover:font-semibold hover:text-white" to="/cookies">Cookie Policy</Link></nav><div className="flex shrink-0 items-center gap-2 self-start lg:pr-4"><p>© {new Date().getFullYear()} Wedding Waitress</p>{showBackToTop && <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="ww-focus grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/15"><ArrowUp size={18} aria-hidden="true" /></button>}</div></div>
    </div>
  </footer>;
};
