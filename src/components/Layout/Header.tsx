import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { SignInModal } from "@/components/auth/SignInModal";

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

  const handleBackToSignUp = () => {
    setSignInOpen(false);
    setTimeout(() => {
      signUpButtonRef.current?.click();
    }, 100);
  };

  const productLinks = [
    { label: "Guest List", href: "#guest-list" },
    { label: "Tables & Seating", href: "#tables-seating" },
    { label: "QR Code Seating", href: "#qr-seating" },
    { label: "Running Sheet", href: "#running-sheet" },
    { label: "Invitations & Cards", href: "#invitations" },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {!user && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center">
                  <Link to="/" className="flex items-center pr-6">
                    <img
                      src="/wedding-waitress-new-logo.png"
                      alt="Wedding Waitress Logo"
                      className="h-14 md:h-16 lg:h-20 w-auto hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  <nav className="flex items-center space-x-1 lg:space-x-2">
                    <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                      How it Works
                    </a>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="min-h-[44px] text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                          Products
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 bg-white border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50">
                        {productLinks.map((link) => (
                          <DropdownMenuItem key={link.href} asChild>
                            <a href={link.href} className="cursor-pointer rounded-xl px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900">
                              {link.label}
                            </a>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                      Pricing
                    </a>
                    <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                      FAQ
                    </a>
                    <a href="#contact" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                      Contact
                    </a>
                  </nav>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center justify-center w-full h-14 relative pt-[env(safe-area-inset-top)]">
                  <Link to="/" className="flex items-center">
                    <img
                      src="/wedding-waitress-new-logo-mobile.png?v=2"
                      alt="Wedding Waitress Logo"
                      className="h-9 w-auto hover:opacity-80 transition-opacity"
                    />
                  </Link>

                  <div className="absolute right-0">
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
                      <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50">
                        <DropdownMenuItem onClick={() => setSignInOpen(true)}>
                          <span className="w-full font-semibold" style={{ color: '#6D28D9' }}>Sign In</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <SignUpModal>
                            <button className="w-full text-left font-semibold px-2 py-1.5 rounded-sm hover:bg-accent" style={{ color: '#6D28D9' }}>
                              Sign Up
                            </button>
                          </SignUpModal>
                        </DropdownMenuItem>
                        <div className="my-1 h-px bg-gray-100"></div>
                        <DropdownMenuItem><a href="#how-it-works" className="w-full">How it Works</a></DropdownMenuItem>
                        {productLinks.map((link) => (
                          <DropdownMenuItem key={link.href}><a href={link.href} className="w-full">{link.label}</a></DropdownMenuItem>
                        ))}
                        <DropdownMenuItem><a href="#pricing" className="w-full">Pricing</a></DropdownMenuItem>
                        <DropdownMenuItem><a href="#faq" className="w-full">FAQ</a></DropdownMenuItem>
                        <DropdownMenuItem><a href="#contact" className="w-full">Contact</a></DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </>
            )}

            {/* User Actions */}
            {!hideDashboardElements && (user ? (
              <Button variant="outline" className="glass min-h-[44px]" onClick={onSignOut}>
                Logout
              </Button>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)} className="min-h-[44px] text-sm text-gray-600 hover:text-gray-900">
                  Sign In
                </Button>
                <SignUpModal>
                  <Button ref={signUpButtonRef} size="sm" className="min-h-[44px] text-sm bg-primary hover:bg-primary/90 text-white rounded-xl px-6">
                    Get Started
                  </Button>
                </SignUpModal>
              </div>
            ))}

            {/* Language Selector */}
            {!hideDashboardElements && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:flex hover:bg-gray-50 min-h-[44px] min-w-[44px] text-gray-600">
                    <Globe className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">EN</span>
                    <ChevronDown className="w-3 h-3 ml-1 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl p-2 z-50">
                  <DropdownMenuItem>🇺🇸 English</DropdownMenuItem>
                  <DropdownMenuItem>🇪🇸 Español</DropdownMenuItem>
                  <DropdownMenuItem>🇫🇷 Français</DropdownMenuItem>
                  <DropdownMenuItem>🇩🇪 Deutsch</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={handleBackToSignUp} />
    </header>
  );
};
