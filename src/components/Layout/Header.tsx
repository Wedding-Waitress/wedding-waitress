import React from 'react';
import { Button } from "@/components/ui/enhanced-button";
import { Heart, Globe, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
interface HeaderProps {
  user?: {
    name: string;
    email: string;
  } | null;
  onSignOut?: () => void;
}
export const Header: React.FC<HeaderProps> = ({
  user,
  onSignOut
}) => {
  return <header className="bg-background/95 backdrop-blur-sm border-b border-card-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Wedding Waitress</h1>
              <p className="text-xs text-muted-foreground">Wedding & Event guest list made stress free</p>
            </div>
          </div>

          {/* Center Welcome Message (for dashboard) */}
          {user && <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold text-primary">
                Welcome {user.name}
              </h2>
            </div>}

          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <DropdownMenu>
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
            </DropdownMenu>

            {/* Navigation Links (for landing page) */}
            {!user && <nav className="hidden md:flex items-center space-x-6">
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
                <a href="#contact" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  Contact
                </a>
              </nav>}

            {/* User Actions */}
            {user ? <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="glass">
                    {user.name}'s Dashboard
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
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
                <Button variant="gradient" size="sm">
                  Sign Up
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" asChild>
                  <Link to="/admin">Admin</Link>
                </Button>
              </div>}
          </div>
        </div>
      </div>
    </header>;
};