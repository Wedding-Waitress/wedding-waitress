/**
 * 🔒 PRODUCTION-LOCKED — DO NOT MODIFY
 * Part of the approved public homepage surface (locked 2026-04-18).
 * Any change requires explicit owner approval. See LOCKED_TRANSLATION_KEYS.md.
 */
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Globe, ChevronDown } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { AuthGatedCtaLink } from "@/components/auth/AuthGatedCtaLink";
import { SignInModal } from "@/components/auth/SignInModal";
import { useTranslation } from 'react-i18next';
import { CurrencySelector } from "@/components/ui/CurrencySelector";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const signUpButtonRef = useRef<HTMLButtonElement>(null);
  const { t, i18n } = useTranslation('landing');
  const currentLang = headerLanguages.find(l => l.code === i18n.language) || headerLanguages[0];
  const { currency, setCurrency } = useCurrencyContext();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const handleBackToSignUp = () => {
    setSignInOpen(false);
    setTimeout(() => {
      signUpButtonRef.current?.click();
    }, 100);
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

  const productLinks = [
    { label: "My Events", href: "/my-events" },
    { label: "Guest List", href: "/guest-list" },
    { label: "Tables", href: "/tables" },
    { label: "QR Code Seating Chart", href: "/qr-code-seating-chart" },
    { label: "Invitations & Cards", href: "/invitations-cards" },
    { label: "Name Place Cards", href: "/name-place-cards" },
    { label: "Individual Table Charts", href: "/individual-table-charts" },
    { label: "Floor Plan", href: "/floor-plan" },
    { label: "Dietary Requirements", href: "/dietary-requirements" },
    { label: "Full Seating Chart", href: "/full-seating-chart" },
    { label: "Kiosk Live View", href: "/kiosk-live-view" },
    { label: "DJ-MC Questionnaire", href: "/dj-mc-questionnaire" },
    { label: "Running Sheet", href: "/running-sheet" },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between w-full">
          {/* Logo — always left. Click: scroll to top, no reload if already on / */}
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                // Allow navigation, then scroll to top after route change
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
              }
            }}
            className="flex items-center flex-shrink-0"
          >
            <img
              src="/wedding-waitress-logo-full.png"
              alt="Wedding Waitress Logo"
              className="h-12 lg:h-14 w-auto hover:opacity-80 transition-opacity"
            />
          </Link>

          {!user && (
            <>
              {/* Desktop Nav — right side (lg+ only) */}
              <div className="hidden lg:flex items-center gap-1 lg:gap-2">
                <nav className="flex items-center space-x-1 lg:space-x-2">
                  <Link to="/how-it-works" onClick={() => window.scrollTo(0, 0)} className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.howItWorks')}
                  </Link>
                  <DropdownMenu>
                    <div className="flex items-center">
                      <Link
                        to="/products"
                        onClick={() => window.scrollTo(0, 0)}
                        className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80"
                      >
                        {t('nav.products')}
                      </Link>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label="Open products menu" className="min-h-[44px] px-2 text-gray-800 hover:text-gray-950 hover:bg-gray-50/80">
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50 max-h-[70vh] overflow-y-auto">
                      {productLinks.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <Link
                            to={link.href}
                            onClick={() => window.scrollTo(0, 0)}
                            className="cursor-pointer rounded-xl px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:text-gray-950 hover:bg-gray-50/80"
                          >
                            {link.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link to="/pricing" onClick={() => window.scrollTo(0, 0)} className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.pricing')}
                  </Link>
                  <Link to="/blog" onClick={() => window.scrollTo(0, 0)} className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.blog')}
                  </Link>
                  <Link to="/faq" onClick={() => window.scrollTo(0, 0)} className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.faq')}
                  </Link>
                  <Link to="/contact" onClick={() => window.scrollTo(0, 0)} className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.contact')}
                  </Link>
                </nav>

                {!hideDashboardElements && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)} className="min-h-[44px] text-[15px] font-medium text-gray-800 hover:text-gray-950">
                      {t('nav.signIn')}
                    </Button>
                    <AuthGatedCtaLink to="/dashboard" asChild alwaysSignUp>
                      <Button ref={signUpButtonRef} size="sm" className="min-h-[44px] text-sm bg-primary hover:bg-primary/90 text-white rounded-xl px-6">
                        {t('nav.getStarted')}
                      </Button>
                    </AuthGatedCtaLink>
                    <CurrencySelector currency={currency} onCurrencyChange={setCurrency} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="hover:bg-gray-50 min-h-[44px] min-w-[44px] text-gray-700">
                          <Globe className="w-4 h-4 mr-1" />
                          <span className="text-[14px]">{currentLang.code.toUpperCase()}</span>
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50 max-h-[60vh] overflow-y-auto">
                        {headerLanguages.map((lang) => (
                          <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)} className="cursor-pointer">
                            {lang.flag} {lang.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* Mobile + Tablet hamburger */}
              <div className="lg:hidden relative">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center"
                  style={{ backgroundColor: '#967A59' }}
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <div className="flex flex-col space-y-1">
                    <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                    <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                    <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                  </div>
                </button>
                {mobileMenuOpen && (() => {
                  // Uniform spacing for ALL items (main + product dropdown)
                  const itemStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 500, lineHeight: '20px', paddingTop: '6px', paddingBottom: '6px', margin: 0 };
                  // Pill style for Sign In / Sign Up — thin brown border matching the brown text
                  const pillStyle: React.CSSProperties = { color: '#967A59', borderColor: '#967A59', fontSize: '13px', fontWeight: 500, lineHeight: '14px', paddingTop: '2px', paddingBottom: '2px', minHeight: 0, height: '22px' };
                  return (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50 max-h-[90vh] overflow-y-auto">
                    {/* Sign In / Sign Up — pill-shaped with thin brown border, identical size */}
                    <div className="flex items-center gap-2 px-1 pb-2">
                      <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); setSignInOpen(true); }}
                        className="mobile-auth-pill inline-flex items-center justify-center rounded-full border bg-white hover:bg-gray-50 transition-colors px-3 leading-none"
                        style={pillStyle}
                      >
                        {t('nav.signIn')}
                      </button>
                      <SignUpModal>
                        <button
                          type="button"
                          className="mobile-auth-pill inline-flex items-center justify-center rounded-full border bg-white hover:bg-gray-50 transition-colors px-3 leading-none"
                          style={pillStyle}
                        >
                          {t('nav.signUp')}
                        </button>
                      </SignUpModal>
                    </div>

                    {/* Main nav — uniform padding */}
                    <Link
                      to="/how-it-works"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.howItWorks')}
                    </Link>

                    {/* Products — collapsible, same padding as siblings */}
                    <button
                      type="button"
                      onClick={() => setMobileProductsOpen(v => !v)}
                      aria-expanded={mobileProductsOpen}
                      className="w-full flex items-center justify-between px-3 hover:bg-gray-50 rounded-xl"
                      style={itemStyle}
                    >
                      <span>{t('nav.products')}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${mobileProductsOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {mobileProductsOpen && (
                      <div>
                        {productLinks.map((link) => (
                          <Link
                            key={link.href}
                            to={link.href}
                            onClick={() => { setMobileMenuOpen(false); setMobileProductsOpen(false); window.scrollTo(0, 0); }}
                            className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
                            style={itemStyle}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link
                      to="/pricing"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.pricing')}
                    </Link>
                    <Link
                      to="/blog"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.blog')}
                    </Link>
                    <Link
                      to="/faq"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
                      style={itemStyle}
                    >
                      {t('nav.faq')}
                    </Link>
                    <Link
                      to="/contact"
                      onClick={() => { setMobileMenuOpen(false); window.scrollTo(0, 0); }}
                      className="block w-full text-left px-3 hover:bg-gray-50 rounded-xl"
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

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={handleBackToSignUp} />
    </header>
  );
};
