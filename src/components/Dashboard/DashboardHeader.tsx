import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import logoImage from '@/assets/wedding-waitress-header-logo.png';
import { Sparkles } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
export const DashboardHeader: React.FC = () => {
  const { profile } = useProfile();
  const isMobile = useIsMobile();
  
  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  };
  
  return <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 print:hidden">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 my-[10px] gap-2">
        {/* Mobile hamburger trigger */}
        {isMobile && (
          <div className="flex items-center">
            <SidebarTrigger className="mr-2" />
          </div>
        )}
        
        {/* Logo on the left */}
        <div className="flex items-center flex-shrink-0">
          <img src={logoImage} alt="Wedding Waitress" className="h-12 md:h-14 w-auto" />
        </div>

        {/* Welcome message in the center */}
        <div className="flex items-center justify-center flex-1 min-w-0">
          <h2 className="text-base md:text-xl lg:text-2xl font-semibold text-primary flex items-center gap-2 truncate">
            <span className="hidden sm:inline">Welcome </span>
            <span className="truncate">{getDisplayName()}</span>
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-primary flex-shrink-0" />
          </h2>
        </div>

        {/* Empty div for balance on desktop */}
        {!isMobile && <div className="flex-shrink-0 w-[56px]"></div>}
      </div>
    </header>;
};