import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SignUpModal } from "@/components/auth/SignUpModal";
import { SignInModal } from "@/components/auth/SignInModal";

interface HeaderProps {
  user?: { first_name: string; email: string } | null;
  onSignOut?: () => void;
  hideDashboardElements?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut, hideDashboardElements = false }) => {
  const [signInOpen, setSignInOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const signUpButtonRef = useRef<HTMLButtonElement>(null);

  const handleBackToSignUp = () => {
    setSignInOpen(false);
    setTimeout(() => { signUpButtonRef.current?.click(); }, 100);
  };

  const productLinks = [
    { label: "Guest List", href: "#guest-list" },
    { label: "Tables & Seating", href: "#tables-seating" },
    { label: "QR Code Seating", href: "#qr-seating" },
    { label: "Running Sheet", href: "#running-sheet" },
    { label: "DJ & Music", href: "#dj-music" },
    { label: "Floor Plan", href: "#floor-plan" },
    { label: "Invitations & Cards", href: "#invitations" },
  ];

  return (
    <header className="backdrop-blur-md border-b border-white/10 sticky top-0 z-50" style={{ background: 'rgba(91, 46, 255, 0.35)' }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Left — Logo + Nav (Desktop) */}
          {!user && (
            <>
              <div className="hidden md:flex items-center gap-8">
                <Link to="/" className="flex items-center flex-shrink-0">
                  <img src="/wedding-waitress-new-logo.png" alt="Wedding Waitress Logo" className="h-12 lg:h-14 w-auto hover:opacity-80 transition-opacity" />
                </Link>
                <nav className="flex items-center gap-1">
                  <a href="#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                    How it Works
                  </a>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 min-h-[40px]">
                        Products <ChevronDown className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52 bg-background/95 backdrop-blur-lg border-white/20 z-50">
                      {productLinks.map((link) => (
                        <DropdownMenuItem key={link.href} asChild>
                          <a href={link.href} className="cursor-pointer">{link.label}</a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <a href="#pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                    Pricing
                  </a>
                  <a href="#faq" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                    FAQ
                  </a>
                  <a href="#contact" className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
                    Contact
                  </a>
                </nav>
              </div>

              {/* Mobile — Logo center + hamburger */}
              <div className="md:hidden flex items-center justify-center w-full h-12 relative pt-[env(safe-area-inset-top)]">
                <Link to="/" className="flex items-center">
                  <img src="/wedding-waitress-new-logo-mobile.png?v=2" alt="Wedding Waitress Logo" className="h-9 w-auto hover:opacity-80 transition-opacity" />
                </Link>
                <div className="absolute right-0">
                  <DropdownMenu onOpenChange={setMobileMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-2 rounded-lg" style={{ backgroundColor: '#6D28D9' }} aria-label="Open menu" aria-expanded={mobileMenuOpen}>
                        <div className="flex flex-col space-y-1">
                          <div className="w-5 h-0.5 bg-white rounded-sm" />
                          <div className="w-5 h-0.5 bg-white rounded-sm" />
                          <div className="w-5 h-0.5 bg-white rounded-sm" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-lg z-50">
                      <DropdownMenuItem onClick={() => setSignInOpen(true)}>
                        <span className="w-full font-semibold" style={{ color: '#6D28D9' }}>Sign In</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <SignUpModal>
                          <button className="w-full text-left font-semibold px-2 py-1.5 rounded-sm hover:bg-accent" style={{ color: '#6D28D9' }}>Sign Up</button>
                        </SignUpModal>
                      </DropdownMenuItem>
                      <div className="my-1 h-px bg-border" />
                      <DropdownMenuItem><a href="#how-it-works" className="w-full">How it Works</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#guest-list" className="w-full">Guest List</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#tables-seating" className="w-full">Tables & Seating</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#qr-seating" className="w-full">QR Code Seating</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#pricing" className="w-full">Pricing</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#faq" className="w-full">FAQ</a></DropdownMenuItem>
                      <DropdownMenuItem><a href="#contact" className="w-full">Contact</a></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </>
          )}

          {/* Right — Auth + Language */}
          <div className="flex items-center gap-2">
            {!hideDashboardElements && (user ? (
              <Button variant="outline" className="glass min-h-[44px]" onClick={onSignOut}>Logout</Button>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSignInOpen(true)} className="min-h-[40px] text-sm border-white/20 text-white hover:bg-white/10">
                  Sign In
                </Button>
                <SignUpModal>
                  <Button ref={signUpButtonRef} variant="default" size="sm" className="min-h-[40px] text-sm">
                    Sign Up
                  </Button>
                </SignUpModal>
              </div>
            ))}

            {!hideDashboardElements && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden md:flex hover:bg-white/10 min-h-[40px] min-w-[40px] text-white/70">
                    <Globe className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline text-sm">EN</span>
                    <ChevronDown className="w-3 h-3 ml-1 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-lg z-50">
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
