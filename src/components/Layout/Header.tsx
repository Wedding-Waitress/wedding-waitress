import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { SignInModal } from "@/components/auth/SignInModal";
import { useTranslation } from 'react-i18next';

const headerLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
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
  const signUpButtonRef = useRef<HTMLButtonElement>(null);
  const { t, i18n } = useTranslation('landing');
  const currentLang = headerLanguages.find(l => l.code === i18n.language) || headerLanguages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const handleBackToSignUp = () => {
    setSignInOpen(false);
    setTimeout(() => {
      signUpButtonRef.current?.click();
    }, 100);
  };

  const productLinks = [
    { label: "My Events", href: "#my-events" },
    { label: "Tables", href: "#tables-seating" },
    { label: "Guest List", href: "#guest-list" },
    { label: "QR Code Seating Chart", href: "#qr-seating" },
    { label: "Invitations & Cards", href: "#invitations" },
    { label: "Name Place Cards", href: "#place-cards" },
    { label: "Individual Table Charts", href: "#table-charts" },
    { label: "Floor Plan", href: "#floor-plan" },
    { label: "Dietary Requirements", href: "#dietary" },
    { label: "Full Seating Chart", href: "#seating-chart" },
    { label: "Kiosk Live View", href: "#kiosk" },
    { label: "DJ-MC Questionnaire", href: "#dj-mc" },
    { label: "Running Sheet", href: "#running-sheet" },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between w-full">
          {/* Logo — always left */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src="/wedding-waitress-logo-full.png"
              alt="Wedding Waitress Logo"
              className="h-12 lg:h-14 w-auto hover:opacity-80 transition-opacity"
            />
          </Link>

          {!user && (
            <>
              {/* Desktop Nav — right side */}
              <div className="hidden md:flex items-center gap-1 lg:gap-2">
                <nav className="flex items-center space-x-1 lg:space-x-2">
                  <a href="#how-it-works" className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.howItWorks')}
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="min-h-[44px] text-[15px] font-medium text-gray-800 hover:text-gray-950 hover:bg-gray-50/80">
                        {t('nav.products')}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50 max-h-[70vh] overflow-y-auto">
                      {productLinks.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <a href={link.href} className="cursor-pointer rounded-xl px-4 py-2.5 text-[14px] font-medium text-gray-700 hover:text-gray-950 hover:bg-gray-50/80">
                            {link.label}
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <a href="#pricing" className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.pricing')}
                  </a>
                  <a href="#faq" className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.faq')}
                  </a>
                  <a href="#contact" className="text-[15px] font-medium text-gray-800 hover:text-gray-950 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50/80">
                    {t('nav.contact')}
                  </a>
                </nav>

                {!hideDashboardElements && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)} className="min-h-[44px] text-[15px] font-medium text-gray-800 hover:text-gray-950">
                      {t('nav.signIn')}
                    </Button>
                    <SignUpModal>
                      <Button ref={signUpButtonRef} size="sm" className="min-h-[44px] text-sm bg-primary hover:bg-primary/90 text-white rounded-xl px-6">
                        {t('nav.getStarted')}
                      </Button>
                    </SignUpModal>
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

              {/* Mobile hamburger */}
              <div className="md:hidden">
                <DropdownMenu onOpenChange={setMobileMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                      style={{ backgroundColor: '#6D28D9' }}
                      aria-label="Open menu"
                      aria-expanded={mobileMenuOpen}
                    >
                      <div className="flex flex-col space-y-1">
                        <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                        <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                        <div className="w-5 h-0.5 bg-white rounded-sm"></div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.10)] rounded-2xl p-2 z-50 max-h-[80vh] overflow-y-auto">
                    <DropdownMenuItem onClick={() => setSignInOpen(true)}>
                      <span className="w-full font-semibold" style={{ color: '#6D28D9' }}>{t('nav.signIn')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <SignUpModal>
                        <button className="w-full text-left font-semibold px-2 py-1.5 rounded-sm hover:bg-accent" style={{ color: '#6D28D9' }}>
                          {t('nav.signUp')}
                        </button>
                      </SignUpModal>
                    </DropdownMenuItem>
                    <div className="my-1 h-px bg-gray-100"></div>
                    <DropdownMenuItem><a href="#how-it-works" className="w-full">{t('nav.howItWorks')}</a></DropdownMenuItem>
                    {productLinks.map((link) => (
                      <DropdownMenuItem key={link.href}><a href={link.href} className="w-full">{link.label}</a></DropdownMenuItem>
                    ))}
                    <DropdownMenuItem><a href="#pricing" className="w-full">{t('nav.pricing')}</a></DropdownMenuItem>
                    <DropdownMenuItem><a href="#faq" className="w-full">{t('nav.faq')}</a></DropdownMenuItem>
                    <DropdownMenuItem><a href="#contact" className="w-full">{t('nav.contact')}</a></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
