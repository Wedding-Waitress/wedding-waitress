import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Sparkles, UserCircle, LogOut } from 'lucide-react';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

export const DashboardHeader: React.FC = () => {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const initials = (() => {
    const f = profile?.first_name?.[0] || '';
    const l = profile?.last_name?.[0] || '';
    if (f || l) return (f + l).toUpperCase();
    return (profile?.email?.[0] || 'U').toUpperCase();
  })();

  const handleAccount = () => {
    setSearchParams({ tab: 'account' }, { replace: true });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const ProfileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Open account menu"
          className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#967A59]"
          style={{ backgroundColor: '#967A59' }}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleAccount} className="cursor-pointer">
          <UserCircle className="mr-2 h-4 w-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-border bg-card print:hidden safe-area-top">
      <div className="relative flex h-12 sm:h-10 items-center px-3 sm:px-4 md:px-6">
        {/* Mobile: Show greeting on left */}
        {isMobile && (
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="w-5 h-5 flex-shrink-0 text-primary" />
            <span className="text-base font-medium text-primary truncate">
              Hey {getDisplayName()}!
            </span>
          </div>
        )}
        
        {/* Desktop: Centered welcome message */}
        {!isMobile && (
          <div className="hidden sm:flex items-center justify-center w-full pr-16 lg:pr-0">
            <h2 className="text-xs sm:text-xs md:text-sm lg:text-base font-semibold flex items-center gap-1 sm:gap-2 text-primary">
              <span className="hidden sm:inline">Hey {getDisplayName()}, </span>
              <span className="hidden sm:inline">what are you working on today!</span>
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 flex-shrink-0 text-primary" />
            </h2>
          </div>
        )}
        
        {/* Mobile right side: avatar + hamburger */}
        {isMobile && (
          <div className="flex items-center gap-2">
            {ProfileMenu}
            <button
              onClick={toggleSidebar}
              className="h-12 w-12 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1.5 p-2 transition-all hover:shadow-xl active:scale-95 touch-target bg-primary"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-0.5 bg-white rounded-sm" />
              <div className="w-6 h-0.5 bg-white rounded-sm" />
              <div className="w-6 h-0.5 bg-white rounded-sm" />
            </button>
          </div>
        )}

        {/* Desktop right side: avatar + sidebar trigger */}
        {!isMobile && (
          <div className="absolute right-2 sm:right-4 flex items-center gap-3">
            {ProfileMenu}
            <SidebarTrigger />
          </div>
        )}
      </div>
    </header>
  );
};