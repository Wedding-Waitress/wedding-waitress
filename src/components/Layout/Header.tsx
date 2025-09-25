import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Heart, Globe, ChevronDown } from "lucide-react";
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
  const signUpButtonRef = useRef<HTMLButtonElement>(null);
  const handleBackToSignUp = () => {
    setSignInOpen(false);
    // Trigger the SignUp modal
    setTimeout(() => {
      signUpButtonRef.current?.click();
    }, 100);
  };
  return <header className="bg-background/95 backdrop-blur-sm border-b border-card-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}

          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo and Navigation Links (for landing page) */}
            {!user && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center">
                  <Link to="/" className="flex items-center pr-6">
                    <img 
                      src="/lovable-uploads/651b28f4-e011-4478-a6c7-f4f0a576b92d.png" 
                      alt="Wedding Waitress Logo" 
                      className="h-20 md:h-24 lg:h-36 w-auto hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  <nav className="flex items-center space-x-4 lg:space-x-6">
                    <a href="#how-it-works" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      How it Works
                    </a>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="min-h-[44px]">
                          Products
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass w-48 bg-background z-50">
                        <DropdownMenuItem>My Events</DropdownMenuItem>
                        <DropdownMenuItem>Guest List</DropdownMenuItem>
                        <DropdownMenuItem>Table Setup</DropdownMenuItem>
                        <DropdownMenuItem>Floor Plan</DropdownMenuItem>
                        <DropdownMenuItem>RSVP Invite</DropdownMenuItem>
                        <DropdownMenuItem>Online Wishing Well</DropdownMenuItem>
                        <DropdownMenuItem>QR Code</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <a href="#faq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      FAQ
                    </a>
                    <a href="#pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      Pricing
                    </a>
                    <a href="#contact" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      Contact
                    </a>
                  </nav>
                </div>
                
                {/* Mobile Navigation */}
                <div className="md:hidden flex items-center justify-between w-full">
                  <Link to="/" className="flex items-center">
                    <img 
                      src="/lovable-uploads/651b28f4-e011-4478-a6c7-f4f0a576b92d.png" 
                      alt="Wedding Waitress Logo" 
                      className="h-16 w-auto hover:opacity-80 transition-opacity"
                    />
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="min-h-[44px] min-w-[44px] p-2">
                        <div className="flex flex-col space-y-1">
                          <div className="w-5 h-0.5 bg-foreground"></div>
                          <div className="w-5 h-0.5 bg-foreground"></div>
                          <div className="w-5 h-0.5 bg-foreground"></div>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass w-56 bg-background z-50">
                      <DropdownMenuItem>
                        <a href="#how-it-works" className="w-full">How it Works</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <a href="#products" className="w-full">Products</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <a href="#faq" className="w-full">FAQ</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <a href="#pricing" className="w-full">Pricing</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <a href="#contact" className="w-full">Contact</a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}

            {/* User Actions */}
            {!hideDashboardElements && (user ? <Button variant="outline" className="glass min-h-[44px]" onClick={onSignOut}>
                Logout
              </Button> : <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSignInOpen(true)} className="min-h-[44px] text-xs sm:text-sm">
                  Sign In
                </Button>
                <SignUpModal>
                  <Button ref={signUpButtonRef} variant="gradient" size="sm" className="min-h-[44px] text-xs sm:text-sm">
                    Sign Up
                  </Button>
                </SignUpModal>
                <Button variant="ghost" size="sm" className="text-xs min-h-[44px] hidden sm:block" asChild>
                  <Link to="/admin">Admin</Link>
                </Button>
              </div>)}

            {/* Language Selector */}
            {!hideDashboardElements && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-accent min-h-[44px] min-w-[44px]">
                  <Globe className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">EN</span>
                  <ChevronDown className="w-3 h-3 ml-1 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass bg-background z-50">
                <DropdownMenuItem>🇺🇸 English</DropdownMenuItem>
                <DropdownMenuItem>🇪🇸 Español</DropdownMenuItem>
                <DropdownMenuItem>🇫🇷 Français</DropdownMenuItem>
                <DropdownMenuItem>🇩🇪 Deutsch</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
        </div>
      </div>
      
      <SignInModal open={signInOpen} onOpenChange={setSignInOpen} onBackToSignUp={handleBackToSignUp} />
    </header>;
};