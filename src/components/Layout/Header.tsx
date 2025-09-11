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

          {/* Center Welcome Message (for dashboard) */}
          {user && <div className="flex-1 flex justify-center -ml-8">
              <h2 className="text-4xl font-semibold text-primary">
                Welcome {user.first_name}
              </h2>
            </div>}

          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Logo and Navigation Links (for landing page) */}
            {!user && <div className="hidden md:flex items-center">
              <Link to="/" className="flex items-center pr-6">
                <img 
                  src="/lovable-uploads/651b28f4-e011-4478-a6c7-f4f0a576b92d.png" 
                  alt="Wedding Waitress Logo" 
                  className="h-12 w-auto hover:opacity-80 transition-opacity"
                />
              </Link>
              <nav className="flex items-center space-x-6">
                <a href="#how-it-works" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  How it Works
                </a>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Products
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass w-48">
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
            </div>}

            {/* User Actions */}
            {!hideDashboardElements && (user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="glass">
                    {user.first_name}'s Dashboard
                    <ChevronDown className="w-3 h-3 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-52">
                  <DropdownMenuItem>Account</DropdownMenuItem>
                  <DropdownMenuItem>Plans & Billing</DropdownMenuItem>
                  <DropdownMenuItem onClick={onSignOut} className="text-destructive">
                    Logout
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> : <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setSignInOpen(true)}>
                  Sign In
                </Button>
                <SignUpModal>
                  <Button ref={signUpButtonRef} variant="gradient" size="sm">
                    Sign Up
                  </Button>
                </SignUpModal>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <Link to="/admin">Admin</Link>
                </Button>
              </div>)}

            {/* Language Selector */}
            {!hideDashboardElements && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-accent">
                  <Globe className="w-4 h-4 mr-2" />
                  EN
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass">
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