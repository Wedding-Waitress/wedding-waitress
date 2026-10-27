import { PublicImage } from '@/components/Layout/PublicImage';
import React from 'react';
import { ArrowUp, Facebook, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productsByGroup } from '@/content/publicProducts';
import { publicEventTypes } from '@/content/publicEventTypes';
import { PublicHomeLogoLink } from '@/components/Layout/PublicHomeLogoLink';

type PublicFooterProps = {
  showBackToTop?: boolean;
};

const footerExtraLinks: Record<string, { label: string; path: string }[]> = {
  'Plan & Organise': [
    { label: 'How It Works', path: '/how-it-works' },
  ],
  'Guest Experience': [{ label: 'FAQ', path: '/faq' }],
  'Event-Day Planning': [{ label: 'Blog', path: '/blog' }, { label: 'Contact', path: '/contact' }, { label: 'Pricing', path: '/pricing' }, { label: 'Sign In', path: '/dashboard' }],
};

const footerLinkClass = 'text-sm font-normal text-white/65 hover:font-semibold hover:text-white';

export const PublicFooter: React.FC<PublicFooterProps> = ({ showBackToTop = false }) => {
  return <footer className="ww-public-dashboard-background px-4 py-14 text-white">
    <div className="mx-auto max-w-7xl">
    <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[.85fr_2.15fr]">
      <div><PublicHomeLogoLink className="ww-public-footer-home-logo inline-flex"><PublicImage loading="lazy" sizes="200px" width="1920" height="463" src="/wedding-waitress-logo-full.png" alt="Wedding Waitress" className="h-12 w-auto brightness-0 invert" /></PublicHomeLogoLink><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">An all in one wedding planning and guest experience platform for guests, RSVPs, seating, stationery, event day details and shared memories.</p><div className="mt-6 flex gap-3">{[[Instagram,'Instagram'],[Facebook,'Facebook'],[Youtube,'YouTube']].map(([Icon,label]) => { const SocialIcon = Icon as typeof Instagram; return <a key={label as string} href="#" aria-label={`Wedding Waitress on ${label}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 hover:bg-white/10"><SocialIcon size={18} aria-hidden="true" /></a>; })}</div></div>
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-5">
        {productsByGroup.map((group) => <div key={group.name}><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#d7b985]">{group.name === 'Event-Day Planning' ? 'Event Day Planning' : group.name}</h2><ul className="mt-4 space-y-2">{group.products.map((product) => <li key={product.path}><Link className={footerLinkClass} to={product.path}>{product.shortName}</Link></li>)}{(footerExtraLinks[group.name] ?? []).map(link => <li key={link.path}><Link className={footerLinkClass} to={link.path}>{link.label}</Link></li>)}</ul></div>)}
        <div><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#d7b985]">Event Types</h2><ul className="mt-4 space-y-2">{publicEventTypes.map((eventType) => <li key={eventType.path}><Link className={footerLinkClass} to={eventType.path}>{eventType.shortName}</Link></li>)}</ul></div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-4 pt-8 text-sm font-normal text-white/65">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <p className="inline-flex flex-wrap items-center gap-x-2">Copyright © {new Date().getFullYear()} Wedding Waitress<img src="/flags/australian-flag.jpg" alt="Australian flag" width="32" height="20" className="inline-block h-auto w-8 shrink-0 -translate-y-0.5 -rotate-12 object-contain" /></p>
        <span aria-hidden="true">|</span>
        <p>Powered by: <a className={footerLinkClass} href="https://marketingking.com.au/">Marketing King Australia</a></p>
        <span aria-hidden="true">|</span>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Footer">
          <Link className={footerLinkClass} to="/privacy">Privacy Policy</Link>
          <span aria-hidden="true">|</span>
          <Link className={footerLinkClass} to="/terms">Terms and Conditions</Link>
          <span aria-hidden="true">|</span>
          <Link className={footerLinkClass} to="/cookies">Cookie Policy</Link>
        </nav>
      </div>
      {showBackToTop && <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="ww-focus grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/15"><ArrowUp size={18} aria-hidden="true" /></button>}
    </div>
    </div>
  </footer>;
};
