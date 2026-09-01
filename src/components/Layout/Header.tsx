/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Globe, ChevronDown, ChevronUp, Menu, X, CircleUserRound, ArrowRight, LogIn, UserPlus, HeartHandshake, Gem, CakeSlice, Building2, Gift, Flower2, type LucideIcon } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { AuthGatedCtaLink } from "@/components/auth/AuthGatedCtaLink";
import { SignInModal } from "@/components/auth/SignInModal";
import { useTranslation } from 'react-i18next';
import { productsByGroup } from '@/content/publicProducts';
import { publicEventTypes, type PublicEventTypeId } from '@/content/publicEventTypes';
import { readSignInRedirectState } from '@/lib/authNavigation';
import { getActivePublicNavigation, isCurrentPublicPath } from '@/lib/publicNavigation';
import '@/styles/PublicSite.css';

const headerLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
];

const eventNavigationIconById: Record<PublicEventTypeId, LucideIcon> = {
  weddings: HeartHandshake,
  engagements: Gem,
  'birthdays-parties': CakeSlice,
  'corporate-events': Building2,
  'christmas-seasonal-events': Gift,
  'memorials-celebrations-of-life': Flower2,
};

interface HeaderProps {
  user?: {
    first_name: string;
    email: string;
  } | null;
  onSignOut?: () => void;
  hideDashboardElements?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSignOut,
  hideDashboardElements = false
}) => {
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState('/dashboard');
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [eventsMenuOpen, setEventsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileEventsOpen, setMobileEventsOpen] = useState(false);
  const signUpButtonRef = useRef<HTMLButtonElement>(null);
  const productsMenuTabDestinationRef = useRef<HTMLAnchorElement | null>(null);
  const { t, i18n } = useTranslation('landing');
  const currentLang = headerLanguages.find(l => l.code === i18n.language) || headerLanguages[0];
  const navigate = useNavigate();
  const location = useLocation();
  const activeNavigation = getActivePublicNavigation(location.pathname);
  const isCurrentPath = (path: string) => isCurrentPublicPath(location.pathname, path);

  useEffect(() => {
    const returnTo = readSignInRedirectState(location.state);
    if (!returnTo) return;
    setSignInReturnTo(returnTo);
    setSignInOpen(true);
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  const openSignIn = () => {
    setSignInReturnTo('/dashboard');
    setSignInOpen(true);
  };

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const handleBackToSignUp = () => {
    setSignInOpen(false);
    setTimeout(() => {
      signUpButtonRef.current?.click();
    }, 100);
  };

  const handleProductsMenuTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>('.ww-products-menu-link, .ww-products-menu-cta')
    );
    const currentIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);

    event.preventDefault();
    event.stopPropagation();

    if (nextIndex >= 0 && nextIndex < links.length) {
      links[nextIndex].focus();
      return;
    }

    const adjacentHref = event.shiftKey ? '/products' : '/pricing';
    const adjacentLink = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href="${adjacentHref}"]`))
      .find((link) => link.offsetParent !== null);
    productsMenuTabDestinationRef.current = adjacentLink ?? null;
    setProductsMenuOpen(false);
  };

  // Navigate to a homepage section. Works from any page (blog, product, etc.).
  const goToHash = (hashId: string) => {
    if (location.pathname === '/') {
      const el = document.getElementById(hashId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.hash = hashId;
      }
    } else {
      navigate(`/#${hashId}`);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 py-3">
        <div
          className={`mx-auto flex items-center justify-between ${
            !user ? 'max-w-[81rem] min-[1320px]:justify-end min-[1320px]:gap-2' : 'max-w-7xl'
          }`}
        >
          {/* Logo — always left. Click: scroll to top, no reload if already on / */}
          <Link
            to="/"
            onClick={(e) => {
              // Always close any open mobile menu
              setMobileMenuOpen(false);
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
              }
              // Navigate to "/" then force scroll to top after route mounts.
              // Use multiple scroll attempts to handle iOS Safari + Android Chrome
              // where the new route paints asynchronously.
              const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
              requestAnimationFrame(scrollTop);
              setTimeout(scrollTop, 0);
              setTimeout(scrollTop, 150);
              setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 300);
            }}
            role="link"
            aria-label="Go to homepage"
            className={`flex items-center flex-shrink-0 cursor-pointer touch-manipulation ${
              !user ? 'min-[1320px]:-translate-x-2 min-[1320px]:pr-3' : ''
            }`}
          >
            <img
              src="/wedding-waitress-logo-dark-brown.png"
              alt="Wedding Waitress"
              width="1920"
              height="464"
              className="h-12 lg:h-14 w-auto hover:opacity-80 transition-opacity"
            />
          </Link>

          {!user && (
            <>
              {/* Desktop Nav — right side (lg+ only) */}
              <div className="hidden min-[1320px]:flex items-center gap-1 lg:gap-2">
                <nav className="flex items-center space-x-1 lg:space-x-2">
                  <Link to="/how-it-works" aria-current={location.pathname === '/how-it-works' ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-public-nav-link whitespace-nowrap text-[15px] font-medium transition-colors px-3 py-2 rounded-lg">
                    {t('nav.howItWorks')}
                  </Link>
                  <DropdownMenu open={productsMenuOpen} onOpenChange={setProductsMenuOpen}>
                    <div className="flex items-center">
                      <Link
                        to="/products"
                        onClick={() => window.scrollTo(0, 0)}
                        aria-current={location.pathname === '/products' ? 'page' : undefined}
                        className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg"
                      >
                        {t('nav.products')}
                      </Link>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label="Open products menu" title="Open products menu" className="ww-public-control min-h-[44px] px-2">
                          <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent
                      align="center"
                      collisionPadding={16}
                      onKeyDownCapture={handleProductsMenuTab}
                      onCloseAutoFocus={(event) => {
                        const destination = productsMenuTabDestinationRef.current;
                        if (!destination) return;
                        event.preventDefault();
                        productsMenuTabDestinationRef.current = null;
                        destination.focus();
                      }}
                      className="ww-products-menu bg-white border shadow-[0_18px_55px_rgba(43,23,17,0.16)] rounded-2xl p-5 z-50"
                    >
                      <div className="ww-products-menu-grid">
                        {productsByGroup.map((group) => <div key={group.name}>
                          <p className="ww-products-menu-heading">{group.name}</p>
                          {group.products.map((product) => {
                            const ProductIcon = product.navigationIcon;
                            return <DropdownMenuItem key={product.path} asChild><Link to={product.path} aria-current={location.pathname === product.path ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-products-menu-link ww-product-menu-item cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium"><ProductIcon size={18} strokeWidth={1.8} aria-hidden="true" className="ww-product-menu-icon" /><span className="min-w-0">{product.name}</span></Link></DropdownMenuItem>;
                          })}
                        </div>)}
                      </div>
                      <Link to="/products" className="ww-products-menu-cta ww-button-espresso ww-focus px-5 py-2.5 text-sm">Explore all products →</Link>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu open={eventsMenuOpen} onOpenChange={setEventsMenuOpen}>
                    <div className="flex items-center">
                      <Link
                        to="/events"
                        onClick={() => window.scrollTo(0, 0)}
                        aria-current={location.pathname === '/events' ? 'page' : undefined}
                        className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg"
                      >
                        Events
                      </Link>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label="Open event types menu" title="Open event types menu" className="ww-public-control min-h-[44px] px-2">
                          <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent align="center" collisionPadding={16} className="ww-events-menu bg-white border shadow-[0_18px_55px_rgba(43,23,17,0.16)] rounded-2xl p-5 z-50">
                      <p className="ww-products-menu-heading">Plan by event type</p>
                      <div className="ww-events-menu-grid">
                        {publicEventTypes.map((eventType) => {
                          const EventIcon = eventNavigationIconById[eventType.id];
                          return <DropdownMenuItem key={eventType.path} asChild><Link to={eventType.path} aria-current={location.pathname === eventType.path ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-products-menu-link ww-product-menu-item cursor-pointer rounded-xl px-3 py-2 text-[13px] font-medium"><EventIcon size={18} strokeWidth={1.8} aria-hidden="true" className="ww-product-menu-icon" /><span className="min-w-0">{eventType.name}</span></Link></DropdownMenuItem>;
                        })}
                      </div>
                      <Link to="/events" className="ww-products-menu-cta ww-button-espresso ww-focus px-5 py-2.5 text-sm">Explore all event types →</Link>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link to="/pricing" aria-current={location.pathname === '/pricing' ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg">
                    {t('nav.pricing')}
                  </Link>
                  <Link to="/blog" aria-current={location.pathname.startsWith('/blog') ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg">
                    {t('nav.blog')}
                  </Link>
                  <Link to="/faq" aria-current={location.pathname === '/faq' ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg">
                    {t('nav.faq')}
                  </Link>
                  <Link to="/contact" aria-current={location.pathname === '/contact' ? 'page' : undefined} onClick={() => window.scrollTo(0, 0)} className="ww-public-nav-link text-[15px] font-medium transition-colors px-3 py-2 rounded-lg">
                    {t('nav.contact')}
                  </Link>
                </nav>

                {!hideDashboardElements && (
                  <>
                    <Button variant="ghost" size="sm" onClick={openSignIn} className="ww-public-control min-h-[44px] text-[15px] font-medium">
                      <CircleUserRound size={18} strokeWidth={1.8} aria-hidden="true" className="mr-1.5 shrink-0" />
                      {t('nav.signIn')}
                    </Button>
                    <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp>
                      <Button ref={signUpButtonRef} size="sm" className="ww-button-espresso min-h-[44px] text-sm rounded-xl px-6">
                        Start Planning Free
                        <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" className="ml-1.5 shrink-0" />
                      </Button>
                    </AuthGatedCtaLink>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ww-public-control min-h-[44px] min-w-[44px]">
                          <Globe className="w-4 h-4 mr-1" />
                          <span className="text-[14px]">{currentLang.code.toUpperCase()}</span>
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" collisionPadding={16} className="ww-selector-menu bg-white border shadow-[0_12px_40px_rgba(43,23,17,0.14)] rounded-2xl p-2 z-50 max-h-[60vh] overflow-y-auto">
                        {headerLanguages.map((lang) => (
                          <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)} data-selected={i18n.language === lang.code} dir={lang.code === 'ar' ? 'rtl' : 'ltr'} className="ww-selector-item cursor-pointer rounded-xl">
                            {lang.flag} {lang.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* Mobile + Tablet hamburger */}
              <div className="min-[1320px]:hidden relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="ww-button-espresso min-h-[44px] min-w-[44px] p-2 rounded-xl flex items-center justify-center"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  title={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen
                    ? <X size={18} strokeWidth={1.8} aria-hidden="true" className="text-white" />
                    : <Menu size={18} strokeWidth={1.8} aria-hidden="true" className="text-white" />}
                </button>
                {mobileMenuOpen && (() => {
                  // Uniform spacing for ALL items (main + product dropdown).
                  // minHeight:0 + fixed height:32px overrides the global mobile 48px floor;
                  // flex+alignItems:center keeps text vertically centered in the fixed row.
                  const itemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 500, lineHeight: '20px', paddingTop: '6px', paddingBottom: '6px', margin: 0, minHeight: 0, height: '32px' };
                  const eventItemStyle: React.CSSProperties = { ...itemStyle, minHeight: '44px', height: '44px' };
                  const eventLinkStyle: React.CSSProperties = { ...itemStyle, minHeight: '44px', height: 'auto' };
                  return (
                  <div className="ww-public-mobile-menu absolute top-full right-0 mt-1 w-[min(92vw,360px)] bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 pt-4 z-50 max-h-[82vh] overflow-y-auto">
                    {/* Sign In / Sign Up — universal small pill, perfectly centered */}
                    <div className="flex items-center justify-center gap-3 px-1 pb-2">
                      <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); openSignIn(); }}
                        className="ww-small-pill"
                        style={{ minWidth: '100px' }}
                      >
                        <LogIn size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                        {t('nav.signIn')}
                      </button>
                      <SignUpModal>
                        <button
                          type="button"
                          className="ww-small-pill"
                          style={{ minWidth: '145px' }}
                        >
                          <UserPlus size={14} strokeWidth={1.8} aria-hidden="true" className="shrink-0" />
                        Start Planning Free
                        </button>
                      </SignUpModal>
                    </div>

                    {/* Main nav — uniform padding */}
                    <Link
                      to="/how-it-works"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="ww-public-nav-link block w-full text-left px-3 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.howItWorks')}
                    </Link>

                    {/* Products — collapsible, same padding as siblings */}
                    <button
                      type="button"
                      onClick={() => setMobileProductsOpen(v => !v)}
                      aria-expanded={mobileProductsOpen}
                      className={`ww-public-nav-link w-full flex items-center justify-between px-3 rounded-xl ${mobileProductsOpen ? 'font-semibold' : ''}`}
                      style={itemStyle}
                    >
                      <span>{t('nav.products')}</span>
                      {mobileProductsOpen
                        ? <ChevronUp size={18} strokeWidth={1.8} aria-hidden="true" />
                        : <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                    {mobileProductsOpen && (
                      <div className="ww-mobile-product-grid my-2">
                        {productsByGroup.map((group) => <div key={group.name} className="min-w-0">
                          <p className="ww-products-menu-heading">{group.name}</p>
                          {group.products.map((product) => {
                            const ProductIcon = product.navigationIcon;
                            return <Link key={product.path} to={product.path} aria-current={location.pathname === product.path ? 'page' : undefined} onClick={() => { setMobileMenuOpen(false); setMobileProductsOpen(false); window.scrollTo(0, 0); }} className="ww-products-menu-link ww-product-menu-item ww-product-menu-item-mobile w-full rounded-xl px-3"><ProductIcon size={20} strokeWidth={1.8} aria-hidden="true" className="ww-product-menu-icon" /><span className="min-w-0">{product.name}</span></Link>;
                          })}
                        </div>)}
                        <Link to="/products" onClick={() => { setMobileMenuOpen(false); setMobileProductsOpen(false); window.scrollTo(0, 0); }} className="ww-button-espresso ww-focus col-span-full mt-1 flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold">Explore all products →</Link>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setMobileEventsOpen(v => !v)}
                      aria-expanded={mobileEventsOpen}
                      className={`ww-public-nav-link w-full flex items-center justify-between px-3 rounded-xl ${mobileEventsOpen ? 'font-semibold' : ''}`}
                      style={eventItemStyle}
                    >
                      <span>Events</span>
                      {mobileEventsOpen
                        ? <ChevronUp size={18} strokeWidth={1.8} aria-hidden="true" />
                        : <ChevronDown size={18} strokeWidth={1.8} aria-hidden="true" />}
                    </button>
                    {mobileEventsOpen && (
                      <div className="my-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {publicEventTypes.map((eventType) => {
                          const EventIcon = eventNavigationIconById[eventType.id];
                          return <Link key={eventType.path} to={eventType.path} aria-current={location.pathname === eventType.path ? 'page' : undefined} onClick={() => { setMobileMenuOpen(false); setMobileEventsOpen(false); window.scrollTo(0, 0); }} className="ww-products-menu-link ww-product-menu-item w-full rounded-xl px-3" style={eventLinkStyle}><EventIcon size={18} strokeWidth={1.8} aria-hidden="true" className="ww-product-menu-icon" /><span className="min-w-0">{eventType.name}</span></Link>;
                        })}
                        <Link to="/events" onClick={() => { setMobileMenuOpen(false); setMobileEventsOpen(false); window.scrollTo(0, 0); }} className="ww-button-espresso ww-focus col-span-full mt-1 flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold">Explore all event types →</Link>
                      </div>
                    )}

                    <Link
                      to="/pricing"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className={`ww-public-nav-link block w-full text-left px-3 rounded-xl${mobileProductsOpen || mobileEventsOpen ? ' mt-2 pt-2 border-t border-[#E8E1D6]' : ''}`}
                      style={itemStyle}
                    >
                      {t('nav.pricing')}
                    </Link>
                    <Link
                      to="/blog"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="ww-public-nav-link block w-full text-left px-3 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.blog')}
                    </Link>
                    <Link
                      to="/faq"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="ww-public-nav-link block w-full text-left px-3 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.faq')}
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="ww-public-nav-link block w-full text-left px-3 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.contact')}
                    </Link>
                  </div>
                  );
                })()}
              </div>
            </>
          )}

          {/* Logged-in user actions */}
          {user && !hideDashboardElements && (
            <Button variant="outline" className="glass min-h-[44px]" onClick={onSignOut}>
              {t('nav.logout')}
            </Button>
          )}
        </div>
      </div>

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={handleBackToSignUp} redirectTo={signInReturnTo} />
    </header>
  );
};
